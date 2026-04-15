import { NextRequest, NextResponse } from "next/server"
import { dbQuery } from "@/lib/db"
import { ensureFacultiesTable } from "./_db"

type DbFaculty = {
  id: string
  facultyId: string
  name: string
  department: string | null
  createdAt?: string
  updatedAt?: string
}

export async function GET() {
  try {
    await ensureFacultiesTable()

    const rows = await dbQuery<any>(
      "SELECT id, facultyId, name, department, createdAt, updatedAt FROM academic_module_faculties ORDER BY createdAt DESC",
      [],
    )

    return NextResponse.json({ success: true, data: rows || [] })
  } catch (error) {
    console.error("[GET /api/faculties]", error)
    const message = error instanceof Error ? error.message : "Failed to fetch faculties"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureFacultiesTable()

    const body = await request.json().catch(() => null)
    const facultyId = typeof body?.facultyId === "string" ? body.facultyId.trim() : ""
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const department = typeof body?.department === "string" ? body.department.trim() : ""

    if (!facultyId) {
      return NextResponse.json({ success: false, message: "facultyId is required" }, { status: 400 })
    }
    if (facultyId.length > 50) {
      return NextResponse.json({ success: false, message: "facultyId is too long (max 50 characters)" }, { status: 400 })
    }
    if (!name) {
      return NextResponse.json({ success: false, message: "Faculty name is required" }, { status: 400 })
    }
    if (name.length > 150) {
      return NextResponse.json({ success: false, message: "Faculty name is too long (max 150 characters)" }, { status: 400 })
    }
    if (department && department.length > 150) {
      return NextResponse.json({ success: false, message: "Department is too long (max 150 characters)" }, { status: 400 })
    }

    const existing = await dbQuery<any>(
      "SELECT id FROM academic_module_faculties WHERE LOWER(facultyId) = LOWER(?) LIMIT 1",
      [facultyId],
    )
    if (existing.length > 0) {
      return NextResponse.json({ success: false, message: "Faculty already exists" }, { status: 409 })
    }

    await dbQuery(
      "INSERT INTO academic_module_faculties (id, facultyId, name, department) VALUES (UUID(), ?, ?, NULLIF(?, ''))",
      [facultyId, name, department],
    )

    const created = await dbQuery<any>(
      "SELECT id, facultyId, name, department, createdAt, updatedAt FROM academic_module_faculties WHERE LOWER(facultyId) = LOWER(?) ORDER BY createdAt DESC LIMIT 1",
      [facultyId],
    )

    return NextResponse.json(
      {
        success: true,
        message: "Faculty created successfully",
        data: created[0] || null,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[POST /api/faculties]", error)
    const message = error instanceof Error ? error.message : "Failed to create faculty"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
