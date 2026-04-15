import { NextRequest, NextResponse } from "next/server"
import { dbQuery } from "@/lib/db"

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

function toSectionDto(row: DbSectionRow) {
  return {
    id: String(row.id),
    classId: String(row.classId),
    name: String(row.name),
    roomNumber: String(row.roomNumber),
    capacity: Number(row.capacity),
    currentStudents: Number(row.currentStudents),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureSectionsTable()

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get("classId")?.trim()

    const rows = classId
      ? await dbQuery<any>(
          "SELECT id, classId, name, roomNumber, capacity, currentStudents, createdAt, updatedAt FROM academic_module_sections WHERE classId = ? ORDER BY createdAt DESC",
          [classId]
        )
      : await dbQuery<any>(
          "SELECT id, classId, name, roomNumber, capacity, currentStudents, createdAt, updatedAt FROM academic_module_sections ORDER BY createdAt DESC",
          []
        )

    return NextResponse.json({ success: true, data: (rows || []).map((r: any) => toSectionDto(r as DbSectionRow)) })
  } catch (error) {
    console.error("[GET /api/sections]", error)
    const message = error instanceof Error ? error.message : "Failed to fetch sections"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureClassesTable()
    await ensureSectionsTable()

    const body = await request.json().catch(() => null)
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const roomNumber = typeof body?.roomNumber === "string" ? body.roomNumber.trim() : ""
    const classId = typeof body?.classId === "string" ? body.classId.trim() : ""

    if (!name || !roomNumber || !classId) {
      return NextResponse.json(
        { success: false, message: "name, roomNumber, and classId are required" },
        { status: 400 }
      )
    }

    if (name.length > 100) {
      return NextResponse.json({ success: false, message: "Section name is too long" }, { status: 400 })
    }

    if (roomNumber.length > 50) {
      return NextResponse.json({ success: false, message: "Room number is too long" }, { status: 400 })
    }

    const classRows = await dbQuery<any>("SELECT id FROM academic_module_classes WHERE id = ? LIMIT 1", [classId])
    if (classRows.length === 0) {
      return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 })
    }

    const existing = await dbQuery<any>(
      "SELECT id FROM academic_module_sections WHERE classId = ? AND LOWER(name) = LOWER(?) LIMIT 1",
      [classId, name]
    )
    if (existing.length > 0) {
      return NextResponse.json({ success: false, message: "Section already exists for this class" }, { status: 409 })
    }

    await dbQuery(
      "INSERT INTO academic_module_sections (id, classId, name, roomNumber, capacity, currentStudents) VALUES (UUID(), ?, ?, ?, 30, 0)",
      [classId, name, roomNumber]
    )

    const created = await dbQuery<any>(
      "SELECT id, classId, name, roomNumber, capacity, currentStudents, createdAt, updatedAt FROM academic_module_sections WHERE classId = ? AND LOWER(name) = LOWER(?) ORDER BY createdAt DESC LIMIT 1",
      [classId, name]
    )

    return NextResponse.json(
      {
        success: true,
        message: "Section created successfully",
        data: created[0] ? toSectionDto(created[0] as DbSectionRow) : null,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/sections]", error)
    const message = error instanceof Error ? error.message : "Failed to create section"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
