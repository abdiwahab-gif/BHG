import { NextRequest, NextResponse } from "next/server"
import { dbQuery } from "@/lib/db"
import { ensureCoursesTable } from "./_db"

type DbCourse = {
  id: string
  name: string
  type: string
  code?: string | null
  credits?: number | string | null
  faculty?: string | null
  department?: string | null
  createdAt?: string
  updatedAt?: string
}

export async function GET(request: NextRequest) {
  try {
    await ensureCoursesTable()

    const url = new URL(request.url)
    const search = (url.searchParams.get("search") || "").trim()
    const faculty = (url.searchParams.get("faculty") || "").trim()
    const department = (url.searchParams.get("department") || "").trim()
    const limitRaw = (url.searchParams.get("limit") || "").trim()
    const limitParsed = limitRaw ? Number(limitRaw) : NaN
    const limit = Number.isFinite(limitParsed) ? Math.max(1, Math.min(500, Math.floor(limitParsed))) : undefined

    const where: string[] = []
    const params: any[] = []

    if (search) {
      const q = `%${search.toLowerCase()}%`
      where.push("(LOWER(name) LIKE ? OR LOWER(code) LIKE ?)")
      params.push(q, q)
    }
    if (faculty) {
      where.push("faculty = ?")
      params.push(faculty)
    }
    if (department) {
      where.push("department = ?")
      params.push(department)
    }

    let sql =
      "SELECT id, name, type, code, credits, faculty, department, createdAt, updatedAt FROM academic_module_courses"
    if (where.length > 0) sql += ` WHERE ${where.join(" AND ")}`
    sql += " ORDER BY createdAt DESC"
    if (limit) {
      // Some MySQL/MariaDB setups reject placeholders inside LIMIT.
      sql += ` LIMIT ${limit}`
    }

    const rows = await dbQuery<any>(sql, params)

    return NextResponse.json({ success: true, data: rows || [] })
  } catch (error) {
    console.error("[GET /api/courses]", error)
    const message = error instanceof Error ? error.message : "Failed to fetch courses"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureCoursesTable()

    const body = await request.json().catch(() => null)
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const type = typeof body?.type === "string" ? body.type.trim() : ""
    const code = typeof body?.code === "string" ? body.code.trim() : ""
    const faculty = typeof body?.faculty === "string" ? body.faculty.trim() : ""
    const department = typeof body?.department === "string" ? body.department.trim() : ""
    const creditsRaw = body?.credits
    const credits = creditsRaw === undefined || creditsRaw === null || creditsRaw === "" ? null : Number(creditsRaw)

    if (!name) {
      return NextResponse.json({ success: false, message: "Course name is required" }, { status: 400 })
    }

    if (name.length > 100) {
      return NextResponse.json(
        { success: false, message: "Course name is too long (max 100 characters)" },
        { status: 400 }
      )
    }

    if (type !== "Core" && type !== "Elective") {
      return NextResponse.json(
        { success: false, message: "Course type must be Core or Elective" },
        { status: 400 }
      )
    }

    if (!code) {
      return NextResponse.json({ success: false, message: "Course code is required" }, { status: 400 })
    }

    if (code && code.length > 30) {
      return NextResponse.json({ success: false, message: "Course code is too long (max 30 characters)" }, { status: 400 })
    }

    if (credits === null) {
      return NextResponse.json({ success: false, message: "Course credits is required" }, { status: 400 })
    }

    if (credits !== null && (!Number.isFinite(credits) || credits <= 0 || credits > 50)) {
      return NextResponse.json({ success: false, message: "Credits must be a number between 0 and 50" }, { status: 400 })
    }

    const existingByCode = await dbQuery<any>(
      "SELECT id FROM academic_module_courses WHERE LOWER(code) = LOWER(?) LIMIT 1",
      [code]
    )
    if (existingByCode.length > 0) {
      return NextResponse.json({ success: false, message: "Course code already exists" }, { status: 409 })
    }

    const existing = await dbQuery<any>(
      "SELECT id FROM academic_module_courses WHERE LOWER(name) = LOWER(?) AND type = ? LIMIT 1",
      [name, type]
    )
    if (existing.length > 0) {
      return NextResponse.json({ success: false, message: "Course already exists" }, { status: 409 })
    }

    await dbQuery(
      "INSERT INTO academic_module_courses (id, name, type, code, credits, faculty, department) VALUES (UUID(), ?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, ''))",
      [name, type, code, credits, faculty, department]
    )

    const created = await dbQuery<any>(
      "SELECT id, name, type, code, credits, faculty, department, createdAt, updatedAt FROM academic_module_courses WHERE LOWER(name) = LOWER(?) AND type = ? ORDER BY createdAt DESC LIMIT 1",
      [name, type]
    )

    return NextResponse.json(
      {
        success: true,
        message: "Course created successfully",
        data: created[0] || null,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/courses]", error)
    const message = error instanceof Error ? error.message : "Failed to create course"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
