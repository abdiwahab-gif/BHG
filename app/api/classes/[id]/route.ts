import { type NextRequest, NextResponse } from "next/server"
import { dbQuery } from "@/lib/db"

type DbClassRow = {
  id: string
  name: string
  description: string | null
  academicYear: string
  createdAt: string
  updatedAt: string
}

async function ensureClassesTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_classes (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT NULL,
      academicYear VARCHAR(20) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_academicYear (academicYear),
      INDEX idx_name (name)
    ) ENGINE=InnoDB`,
    []
  )
}

async function ensureSectionsTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_sections (
      id VARCHAR(36) PRIMARY KEY,
      classId VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      roomNumber VARCHAR(50) NOT NULL,
      capacity INT NOT NULL DEFAULT 30,
      currentStudents INT NOT NULL DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_class_section (classId, name),
      INDEX idx_classId (classId)
    ) ENGINE=InnoDB`,
    []
  )
}

type DbSectionRow = {
  id: string
  classId: string
  name: string
  roomNumber: string
  capacity: number
  currentStudents: number
  createdAt: string
  updatedAt: string
}

function toSectionDto(row: DbSectionRow) {
  return {
    id: String(row.id),
    name: String(row.name),
    roomNumber: String(row.roomNumber),
    capacity: Number(row.capacity),
    currentStudents: Number(row.currentStudents),
  }
}

function toClassDto(row: DbClassRow, sections: DbSectionRow[] = []) {
  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description ? String(row.description) : "",
    academicYear: String(row.academicYear),
    sections: sections.map(toSectionDto),
    courses: [],
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  }
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureClassesTable()
    await ensureSectionsTable()

    const rows = await dbQuery<any>(
      "SELECT id, name, description, academicYear, createdAt, updatedAt FROM academic_module_classes WHERE id = ? LIMIT 1",
      [params.id]
    )

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 })
    }

    const sectionRows = await dbQuery<any>(
      "SELECT id, classId, name, roomNumber, capacity, currentStudents, createdAt, updatedAt FROM academic_module_sections WHERE classId = ? ORDER BY createdAt DESC",
      [params.id]
    )

    return NextResponse.json({
      success: true,
      data: toClassDto(rows[0] as DbClassRow, (sectionRows || []) as DbSectionRow[]),
    })
  } catch (error) {
    console.error("[GET /api/classes/[id]]", error)
    const message = error instanceof Error ? error.message : "Failed to fetch class"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureClassesTable()

    const body = await request.json().catch(() => null)

    const name = typeof body?.name === "string" ? body.name.trim() : undefined
    const description = typeof body?.description === "string" ? body.description.trim() : undefined
    const academicYear = typeof body?.academicYear === "string" ? body.academicYear.trim() : undefined

    const existing = await dbQuery<any>(
      "SELECT id, name, description, academicYear, createdAt, updatedAt FROM academic_module_classes WHERE id = ? LIMIT 1",
      [params.id]
    )
    if (existing.length === 0) {
      return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 })
    }

    const nextName = name ?? String(existing[0].name)
    const nextDescription = description ?? String(existing[0].description ?? "")
    const nextAcademicYear = academicYear ?? String(existing[0].academicYear)

    if (!nextName.trim() || !nextAcademicYear.trim()) {
      return NextResponse.json(
        { success: false, message: "Name and academic year are required" },
        { status: 400 }
      )
    }

    await dbQuery("UPDATE academic_module_classes SET name = ?, description = ?, academicYear = ? WHERE id = ?", [
      nextName,
      nextDescription || null,
      nextAcademicYear,
      params.id,
    ])

    const updated = await dbQuery<any>(
      "SELECT id, name, description, academicYear, createdAt, updatedAt FROM academic_module_classes WHERE id = ? LIMIT 1",
      [params.id]
    )

    const sectionRows = await dbQuery<any>(
      "SELECT id, classId, name, roomNumber, capacity, currentStudents, createdAt, updatedAt FROM academic_module_sections WHERE classId = ? ORDER BY createdAt DESC",
      [params.id]
    )

    return NextResponse.json({
      success: true,
      data: updated[0] ? toClassDto(updated[0] as DbClassRow, (sectionRows || []) as DbSectionRow[]) : null,
    })
  } catch (error) {
    console.error("[PUT /api/classes/[id]]", error)
    const message = error instanceof Error ? error.message : "Failed to update class"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureClassesTable()
    await ensureSectionsTable()

    await dbQuery("DELETE FROM academic_module_classes WHERE id = ?", [params.id])
    await dbQuery("DELETE FROM academic_module_sections WHERE classId = ?", [params.id])

    return NextResponse.json({ success: true, message: "Class deleted successfully" })
  } catch (error) {
    console.error("[DELETE /api/classes/[id]]", error)
    const message = error instanceof Error ? error.message : "Failed to delete class"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
