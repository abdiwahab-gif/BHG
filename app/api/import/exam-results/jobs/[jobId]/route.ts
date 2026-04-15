import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"

import { ensureExamResultsImportTables } from "../../_db"
import { dbQuery } from "@/lib/db"
import { AuthService } from "@/lib/auth"

type DbJobRow = RowDataPacket & {
  id: string
  status: string
  fileName: string
  fileType: string
  headersJson: string
  mappingJson: string | null
  statsJson: string | null
  createdAt: unknown
  updatedAt: unknown
}

function toIso(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString()
  const d = new Date(String(value || ""))
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString()
}

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
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

    if (!AuthService.hasPermission(user, "exam_results", "read")) {
      return NextResponse.json({ success: false, message: "Insufficient permissions" }, { status: 403 })
    }

    await ensureExamResultsImportTables()

    const jobId = String(params?.jobId || "").trim()
    const rows = await dbQuery<DbJobRow>(
      "SELECT id, status, fileName, fileType, headersJson, mappingJson, statsJson, createdAt, updatedAt FROM exam_result_import_jobs WHERE id = ? LIMIT 1",
      [jobId],
    )
    if (!rows.length) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    const job = rows[0]
    return NextResponse.json({
      success: true,
      data: {
        id: String(job.id),
        status: String(job.status),
        fileName: String(job.fileName),
        fileType: String(job.fileType),
        headers: JSON.parse(String(job.headersJson || "[]")),
        mapping: job.mappingJson ? JSON.parse(String(job.mappingJson)) : null,
        stats: job.statsJson ? JSON.parse(String(job.statsJson)) : null,
        createdAt: toIso(job.createdAt),
        updatedAt: toIso(job.updatedAt),
      },
    })
  } catch (error) {
    console.error("[GET /api/import/exam-results/jobs/:jobId]", error)
    const message = error instanceof Error ? error.message : "Failed to load job"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
