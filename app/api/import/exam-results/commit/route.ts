import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import crypto from "crypto"
import { z } from "zod"

import { ensureExamResultsImportTables } from "../_db"
import { getDbPool } from "@/lib/db"
import { AuditLogger } from "@/lib/audit-logger"
import { AuthService } from "@/lib/auth"

type DbImportRow = RowDataPacket & {
  id: string
  rowNumber: number
  normalizedJson: string | null
  action: string | null
  errorsJson: string | null
}

type NormalizedOperation = {
  operationId: string
  examTypeCode: string
  examTypeId?: string
  score: number | null
  maxScore: number | null
  percentage?: number
  gradePoint?: number
  letterGrade?: string
  comments?: string
  action?: "INSERT" | "UPDATE"
}

type NormalizedRow = {
  studentId: string
  courseId?: string
  courseCode?: string
  courseName?: string
  academicYear: string
  semester: string
  comments?: string
  studentUuid?: string
  courseUuid?: string
  sessionId?: string
  semesterId?: string
  operations?: NormalizedOperation[]
}

type DbExistingExamResult = RowDataPacket & {
  id: string
  studentId: string
  courseId: string
  examTypeId: string
  sessionId: string
  semesterId: string
  score: string | number
  maxScore: string | number
  comments: string | null
  isPublished: number | boolean
}

const bodySchema = z.object({ jobId: z.string().uuid() }).strict()

export async function POST(request: NextRequest) {
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

    if (!AuthService.hasPermission(user, "exam_results", "create") && !AuthService.hasPermission(user, "exam_results", "update")) {
      return NextResponse.json({ success: false, message: "Insufficient permissions" }, { status: 403 })
    }

    await ensureExamResultsImportTables()

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Invalid request", details: parsed.error.errors }, { status: 400 })
    }

    const { jobId } = parsed.data
    const jobRows = (await conn.execute<RowDataPacket[]>(
      "SELECT id, status, statsJson FROM exam_result_import_jobs WHERE id = ? LIMIT 1",
      [jobId],
    ))[0] as Array<RowDataPacket & { id: string; status: string; statsJson: string | null }>

    if (!jobRows.length) {
      return NextResponse.json({ success: false, message: "Import job not found" }, { status: 404 })
    }

    const status = String(jobRows[0].status || "")
    if (status !== "VALIDATED") {
      return NextResponse.json({ success: false, message: `Job must be VALIDATED before commit (current: ${status})` }, { status: 409 })
    }

    const errCountRows = (await conn.execute<RowDataPacket[]>(
      "SELECT COUNT(*) as c FROM exam_result_import_rows WHERE jobId = ? AND errorsJson IS NOT NULL",
      [jobId],
    ))[0] as Array<RowDataPacket & { c: number }>
    const errorCount = Number(errCountRows?.[0]?.c ?? 0)
    if (errorCount > 0) {
      return NextResponse.json({ success: false, message: "Fix validation errors before commit", data: { errorCount } }, { status: 409 })
    }

    const chunkSize = 500
    let lastRowNumber = 0
    let inserted = 0
    let updated = 0
    let skipped = 0

    await conn.beginTransaction()

    while (true) {
      const rows = (await conn.execute<RowDataPacket[]>(
        `SELECT id, rowNumber, normalizedJson, action, errorsJson FROM exam_result_import_rows WHERE jobId = ? AND rowNumber > ? ORDER BY rowNumber ASC LIMIT ${chunkSize}`,
        [jobId, lastRowNumber],
      ))[0] as DbImportRow[]

      if (!rows.length) break
      lastRowNumber = Number(rows[rows.length - 1].rowNumber || lastRowNumber)

      const validRows = rows.filter((r) => !r.errorsJson && r.normalizedJson)
      if (!validRows.length) {
        skipped += rows.length
        continue
      }

      const rowData = validRows.map((r) => ({
        id: String(r.id),
        rowNumber: Number(r.rowNumber),
        data: (JSON.parse(String(r.normalizedJson || "{}")) || {}) as NormalizedRow,
      }))

      const operations: Array<{
        rowId: string
        rowNumber: number
        op: NormalizedOperation
        key: string
      }> = []

      for (const r of rowData) {
        const d = r.data
        const ops = Array.isArray(d.operations) ? d.operations : []

        const baseOk = Boolean(d.studentUuid && d.courseUuid && d.sessionId && d.semesterId)
        if (!baseOk) {
          skipped += 1
          continue
        }

        for (const op of ops) {
          const examTypeId = op.examTypeId
          const score = typeof op.score === "number" ? op.score : null
          const maxScore = typeof op.maxScore === "number" ? op.maxScore : null
          if (!examTypeId || score === null || maxScore === null) {
            skipped += 1
            continue
          }

          const key = `${d.studentUuid}|${d.courseUuid}|${examTypeId}|${d.sessionId}|${d.semesterId}`
          operations.push({ rowId: r.id, rowNumber: r.rowNumber, op, key })
        }
      }

      if (!operations.length) {
        continue
      }

      const compositeKeys = operations.map((x) => x.key)

      const placeholders = compositeKeys.map(() => "?").join(",")
      const existingRows = placeholders
        ? ((await conn.execute<RowDataPacket[]>(
            `SELECT
              id, studentId, courseId, examTypeId, sessionId, semesterId,
              score, maxScore, comments, isPublished
            FROM academic_module_exam_results
            WHERE CONCAT(studentId,'|',courseId,'|',examTypeId,'|',sessionId,'|',semesterId) IN (${placeholders})`,
            compositeKeys,
          ))[0] as DbExistingExamResult[])
        : ([] as DbExistingExamResult[])

      const existingByKey = new Map<string, DbExistingExamResult>()
      for (const e of existingRows || []) {
        const key = `${String(e.studentId)}|${String(e.courseId)}|${String(e.examTypeId)}|${String(e.sessionId)}|${String(e.semesterId)}`
        if (!existingByKey.has(key)) existingByKey.set(key, e)
      }

      for (const item of operations) {
        const existing = existingByKey.get(item.key)

        const score = Number(item.op.score)
        const maxScore = Number(item.op.maxScore)
        const percentage = typeof item.op.percentage === "number" ? item.op.percentage : maxScore > 0 ? (score / maxScore) * 100 : 0
        const gradePoint = typeof item.op.gradePoint === "number" ? item.op.gradePoint : 0
        const letterGrade = typeof item.op.letterGrade === "string" ? item.op.letterGrade : ""
        const comments = typeof item.op.comments === "string" ? item.op.comments : ""

        const [studentId, courseId, examTypeId, sessionId, semesterId] = item.key.split("|")

        if (existing) {
          const oldValues = {
            score: Number(existing.score),
            maxScore: Number(existing.maxScore),
            comments: existing.comments ? String(existing.comments) : "",
          }
          const newValues = {
            score,
            maxScore,
            percentage,
            gradePoint,
            letterGrade,
            comments,
          }

          await conn.execute(
            `UPDATE academic_module_exam_results
             SET score = ?, maxScore = ?, percentage = ?, gradePoint = ?, letterGrade = ?, comments = NULLIF(?, ''),
                 modifiedBy = ?, modifiedAt = NOW()
             WHERE id = ?`,
            [score, maxScore, percentage, gradePoint, letterGrade, comments, userId, String(existing.id)],
          )

          await conn.execute(
            "INSERT INTO exam_result_import_changes (id, jobId, examResultId, action, oldJson, newJson) VALUES (UUID(), ?, ?, 'UPDATE', ?, ?)",
            [jobId, String(existing.id), JSON.stringify(oldValues), JSON.stringify(newValues)],
          )

          updated += 1
        } else {
          const id = crypto.randomUUID()
          await conn.execute(
            `INSERT INTO academic_module_exam_results (
              id, studentId, courseId, examTypeId, sessionId, semesterId,
              score, maxScore, percentage, gradePoint, letterGrade,
              comments, isPublished, enteredBy, enteredAt
            ) VALUES (
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              NULLIF(?, ''), FALSE, ?, NOW()
            )`,
            [
              id,
              String(studentId),
              String(courseId),
              String(examTypeId),
              String(sessionId),
              String(semesterId),
              score,
              maxScore,
              percentage,
              gradePoint,
              letterGrade,
              comments,
              userId,
            ],
          )

          await conn.execute(
            "INSERT INTO exam_result_import_changes (id, jobId, examResultId, action, oldJson, newJson) VALUES (UUID(), ?, ?, 'INSERT', NULL, ?)",
            [jobId, id, JSON.stringify({ score, maxScore, percentage, gradePoint, letterGrade, comments })],
          )

          inserted += 1
        }
      }
    }

    await conn.execute(
      "UPDATE exam_result_import_jobs SET status = 'COMMITTED', statsJson = ? WHERE id = ?",
      [JSON.stringify({ inserted, updated, skipped }), jobId],
    )

    try {
      await AuditLogger.log({
        userId,
        userRole: String(userRole || ""),
        userName: String(userName || ""),
        action: "CREATE",
        entityType: "EXAM_RESULTS_IMPORT",
        entityId: jobId,
        oldValues: undefined,
        newValues: { inserted, updated, skipped },
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      })
    } catch (e) {
      console.error("Failed to audit exam results import", e)
    }

    await conn.commit()

    return NextResponse.json({
      success: true,
      message: "Import committed",
      data: { jobId, inserted, updated, skipped },
    })
  } catch (error) {
    try {
      await conn.rollback()
    } catch {
      // ignore
    }

    console.error("[POST /api/import/exam-results/commit]", error)
    const message = error instanceof Error ? error.message : "Failed to commit import"
    return NextResponse.json({ success: false, message }, { status: 500 })
  } finally {
    conn.release()
  }
}
