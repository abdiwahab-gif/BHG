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

export async function GET(request: NextRequest) {
  try {
    await ensureClassesTable()
    await ensureSectionsTable()

    const { searchParams } = new URL(request.url)
    const academicYear = searchParams.get("academicYear")?.trim()

    const rows = academicYear
      ? await dbQuery<any>(
          // Normalize '-' vs '/' so session names like '2026-2027' still match stored class years like '2026/2027'.
          "SELECT id, name, description, academicYear, createdAt, updatedAt FROM academic_module_classes WHERE REPLACE(academicYear, '/', '-') = REPLACE(?, '/', '-') ORDER BY createdAt DESC",
          [academicYear]
        )
      : await dbQuery<any>(
          "SELECT id, name, description, academicYear, createdAt, updatedAt FROM academic_module_classes ORDER BY createdAt DESC",
          []
        )

    const classRows = (rows || []) as DbClassRow[]
    const classIds = classRows.map((r) => String(r.id))

    let sectionsByClassId = new Map<string, DbSectionRow[]>()
    if (classIds.length > 0) {
      const placeholders = classIds.map(() => "?").join(",")
      const sectionRows = await dbQuery<any>(
        `SELECT id, classId, name, roomNumber, capacity, currentStudents, createdAt, updatedAt
         FROM academic_module_sections
         WHERE classId IN (${placeholders})
         ORDER BY createdAt DESC`,
        classIds
      )

      for (const row of sectionRows || []) {
        const classId = String(row.classId)
        const existing = sectionsByClassId.get(classId) || []
        existing.push(row as DbSectionRow)
        sectionsByClassId.set(classId, existing)
      }
    }

    const classes = classRows.map((r) => toClassDto(r, sectionsByClassId.get(String(r.id)) || []))
    const totalSections = classes.reduce((sum, c) => sum + (c.sections?.length || 0), 0)

    return NextResponse.json({
      success: true,
      data: classes,
      total: classes.length,
      metadata: {
        academicYear: academicYear || "all",
        totalSections,
        totalCourses: 0,
      },
    })
  } catch (error) {
    console.error("[GET /api/classes]", error)
    const message = error instanceof Error ? error.message : "Failed to fetch classes"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureClassesTable()
    await ensureSectionsTable()

    const body = await request.json().catch(() => null)
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const description = typeof body?.description === "string" ? body.description.trim() : ""
    const academicYear = typeof body?.academicYear === "string" ? body.academicYear.trim() : ""

    if (!name || !academicYear) {
      return NextResponse.json({ success: false, message: "Name and academic year are required" }, { status: 400 })
    }

    if (name.length > 100) {
      return NextResponse.json(
        { success: false, message: "Class name is too long (max 100 characters)" },
        { status: 400 }
      )
    }

    const existing = await dbQuery<any>(
      "SELECT id FROM academic_module_classes WHERE academicYear = ? AND LOWER(name) = LOWER(?) LIMIT 1",
      [academicYear, name]
    )
    if (existing.length > 0) {
      return NextResponse.json({ success: false, message: "Class already exists" }, { status: 409 })
    }

    await dbQuery("INSERT INTO academic_module_classes (id, name, description, academicYear) VALUES (UUID(), ?, ?, ?)", [
      name,
      description || null,
      academicYear,
    ])

    const created = await dbQuery<any>(
      "SELECT id, name, description, academicYear, createdAt, updatedAt FROM academic_module_classes WHERE academicYear = ? AND LOWER(name) = LOWER(?) ORDER BY createdAt DESC LIMIT 1",
      [academicYear, name]
    )

    const newClass = created[0] ? toClassDto(created[0] as DbClassRow, []) : null

    return NextResponse.json(
      {
        success: true,
        data: newClass,
        message: "Class created successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/classes]", error)
    const message = error instanceof Error ? error.message : "Failed to create class"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
