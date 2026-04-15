import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { dbQuery } from "@/lib/db"
import { ensureCoursesTable } from "@/app/api/courses/_db"

const querySchema = z.object({
  faculty: z.string().optional(),
})

type DeptRow = RowDataPacket & { department: string | null }

export async function GET(request: NextRequest) {
  try {
    await ensureCoursesTable()

    const { searchParams } = new URL(request.url)
    const { faculty } = querySchema.parse(Object.fromEntries(searchParams))

    const where: string[] = ["department IS NOT NULL", "TRIM(department) <> ''"]
    const params: unknown[] = []

    if (faculty && faculty.trim()) {
      where.push("LOWER(TRIM(faculty)) = LOWER(TRIM(?))")
      params.push(faculty.trim())
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const rows = await dbQuery<DeptRow>(
      `SELECT DISTINCT TRIM(department) as department
       FROM academic_module_courses
       ${whereSql}
       ORDER BY department ASC`,
      params,
    )

    const departments = (rows || [])
      .map((r) => String(r.department || "").trim())
      .filter(Boolean)

    return NextResponse.json({ success: true, departments })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load departments"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
