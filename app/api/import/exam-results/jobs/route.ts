import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"

import { ensureExamResultsImportTables } from "../_db"
import { dbQuery } from "@/lib/db"
import { AuthService } from "@/lib/auth"

type DbJobRow = RowDataPacket & {
  id: string
  status: string
  fileName: string
  fileType: string
  statsJson: string | null
  createdById: string
  createdByRole: string | null
  createdByName: string | null
  createdAt: unknown
}

function toIso(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString()
  const d = new Date(String(value || ""))
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString()
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("limit") || "20", 10) || 20))

    const rows = await dbQuery<DbJobRow>(
      "SELECT id, status, fileName, fileType, statsJson, createdById, createdByRole, createdByName, createdAt FROM exam_result_import_jobs ORDER BY createdAt DESC LIMIT ?",
      [limit],
    )

    const items = (rows || []).map((r) => ({
      id: String(r.id),
      status: String(r.status),
      fileName: String(r.fileName),
      fileType: String(r.fileType),
      stats: r.statsJson ? JSON.parse(String(r.statsJson)) : null,
      createdBy: {
        id: String(r.createdById),
        role: String(r.createdByRole || ""),
        name: String(r.createdByName || ""),
      },
      createdAt: toIso(r.createdAt),
    }))

    return NextResponse.json({ success: true, data: { items } })
  } catch (error) {
    console.error("[GET /api/import/exam-results/jobs]", error)
    const message = error instanceof Error ? error.message : "Failed to load import jobs"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
