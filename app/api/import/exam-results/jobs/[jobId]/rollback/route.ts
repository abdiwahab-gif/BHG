import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"

import { ensureExamResultsImportTables } from "../../../_db"
import { getDbPool } from "@/lib/db"
import { AuthService } from "@/lib/auth"
import { AuditLogger } from "@/lib/audit-logger"

type DbChangeRow = RowDataPacket & {
  examResultId: string
  action: string
  oldJson: string | null
}

export async function POST(request: NextRequest, { params }: { params: { jobId: string } }) {
  const pool = getDbPool()
  const conn = await pool.getConnection()

  try {
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")
    const userName = request.headers.get("x-user-name")

    if (!userId) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
    }

    const user = {
      id: userId,
      role: (userRole as any) || "student",
      name: userName || "",
      isActive: true,
      email: "",
      permissions: [],
      createdAt: new Date(0),
    } as any

    // Rollback is a privileged action.
    if (!AuthService.hasPermission(user, "exam_results", "delete")) {
      return NextResponse.json({ success: false, message: "Insufficient permissions" }, { status: 403 })
    }

    await ensureExamResultsImportTables()

    const jobId = String(params?.jobId || "").trim()
    const jobRows = (await conn.execute<RowDataPacket[]>(
      "SELECT id, status FROM exam_result_import_jobs WHERE id = ? LIMIT 1",
      [jobId],
    ))[0] as Array<RowDataPacket & { id: string; status: string }>

    if (!jobRows.length) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    const status = String(jobRows[0].status || "")
    if (status !== "COMMITTED") {
      return NextResponse.json({ success: false, message: `Only COMMITTED jobs can be rolled back (current: ${status})` }, { status: 409 })
    }

    const changes = (await conn.execute<RowDataPacket[]>(
      "SELECT examResultId, action, oldJson FROM exam_result_import_changes WHERE jobId = ? ORDER BY createdAt DESC",
      [jobId],
    ))[0] as DbChangeRow[]

    await conn.beginTransaction()

    let deleted = 0
    let reverted = 0

    for (const c of changes) {
      const action = String(c.action).toUpperCase()
      const examResultId = String(c.examResultId)
      if (action === "INSERT") {
        await conn.execute("DELETE FROM academic_module_exam_results WHERE id = ?", [examResultId])
        deleted += 1
        continue
      }
      if (action === "UPDATE") {
        const oldValues = c.oldJson ? (JSON.parse(String(c.oldJson)) as any) : null
        if (!oldValues) continue
        await conn.execute(
          "UPDATE academic_module_exam_results SET score = ?, maxScore = ?, comments = NULLIF(?, ''), modifiedBy = ?, modifiedAt = NOW() WHERE id = ?",
          [Number(oldValues.score), Number(oldValues.maxScore), String(oldValues.comments || ""), userId, examResultId],
        )
        reverted += 1
      }
    }

    await conn.execute("UPDATE exam_result_import_jobs SET status = 'ROLLED_BACK' WHERE id = ?", [jobId])

    try {
      await AuditLogger.log({
        userId,
        userRole: String(userRole || ""),
        userName: String(userName || ""),
        action: "DELETE",
        entityType: "EXAM_RESULTS_IMPORT",
        entityId: jobId,
        oldValues: { status: "COMMITTED" },
        newValues: { status: "ROLLED_BACK", deleted, reverted },
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      })
    } catch (e) {
      console.error("Failed to audit import rollback", e)
    }

    await conn.commit()

    return NextResponse.json({ success: true, message: "Rollback complete", data: { jobId, deleted, reverted } })
  } catch (error) {
    try {
      await conn.rollback()
    } catch {
      // ignore
    }
    console.error("[POST /api/import/exam-results/jobs/:jobId/rollback]", error)
    const message = error instanceof Error ? error.message : "Failed to rollback"
    return NextResponse.json({ success: false, message }, { status: 500 })
  } finally {
    conn.release()
  }
}
