import { type NextRequest, NextResponse } from "next/server"
import { dbQuery } from "@/lib/db"

type DbSyllabusRow = {
  id: string
  name: string
  faculty: string | null
  classId: string
  courseId: string
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
  uploadedBy: string
  uploadedAt: string
  updatedAt: string
  className?: string | null
  courseName?: string | null
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

async function ensureCoursesTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_courses (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_type (type),
      INDEX idx_name (name)
    ) ENGINE=InnoDB`,
    []
  )
}

async function ensureSyllabiTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_syllabi (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      faculty VARCHAR(255) NOT NULL DEFAULT '',
      classId VARCHAR(36) NOT NULL,
      courseId VARCHAR(36) NOT NULL,
      fileName VARCHAR(255) NOT NULL,
      fileUrl TEXT NOT NULL,
      fileSize BIGINT NOT NULL,
      fileType VARCHAR(150) NOT NULL,
      fileData LONGBLOB NULL,
      uploadedBy VARCHAR(255) NOT NULL,
      uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_classId (classId),
      INDEX idx_courseId (courseId),
      INDEX idx_uploadedAt (uploadedAt),
      INDEX idx_name (name)
    ) ENGINE=InnoDB`,
    []
  )

  try {
    await dbQuery(
      "ALTER TABLE academic_module_syllabi ADD COLUMN fileData LONGBLOB NULL",
      []
    )
  } catch {
    // ignore if column already exists
  }

  try {
    await dbQuery(
      "ALTER TABLE academic_module_syllabi ADD COLUMN faculty VARCHAR(255) NOT NULL DEFAULT ''",
      []
    )
  } catch {
    // ignore if column already exists
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureClassesTable()
    await ensureCoursesTable()
    await ensureSyllabiTable()

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Missing syllabus id" }, { status: 400 })
    }

    const rows = await dbQuery<any>(
      `SELECT
         s.id, s.name, s.faculty, s.classId, c.name as className,
         s.courseId, crs.name as courseName,
         s.fileName, s.fileUrl, s.fileSize, s.fileType,
         s.uploadedBy, s.uploadedAt, s.updatedAt
       FROM academic_module_syllabi s
       LEFT JOIN academic_module_classes c ON c.id = s.classId
       LEFT JOIN academic_module_courses crs ON crs.id = s.courseId
       WHERE s.id = ?
       LIMIT 1`,
      [id]
    )

    if (!rows?.[0]) {
      return NextResponse.json({ error: "Syllabus not found" }, { status: 404 })
    }

    await dbQuery("DELETE FROM academic_module_syllabi WHERE id = ?", [id])

    return NextResponse.json({
      message: "Syllabus deleted successfully",
      syllabus: rows[0] as DbSyllabusRow,
    })
  } catch (error) {
    console.error("Error deleting syllabus:", error)
    return NextResponse.json(
      { error: "Failed to delete syllabus" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureClassesTable()
    await ensureCoursesTable()
    await ensureSyllabiTable()

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Missing syllabus id" }, { status: 400 })
    }

    const rows = await dbQuery<any>(
      `SELECT
         s.id, s.name, s.faculty, s.classId, c.name as className,
         s.courseId, crs.name as courseName,
         s.fileName, s.fileUrl, s.fileSize, s.fileType,
         s.uploadedBy, s.uploadedAt, s.updatedAt
       FROM academic_module_syllabi s
       LEFT JOIN academic_module_classes c ON c.id = s.classId
       LEFT JOIN academic_module_courses crs ON crs.id = s.courseId
       WHERE s.id = ?
       LIMIT 1`,
      [id]
    )

    if (!rows?.[0]) {
      return NextResponse.json({ error: "Syllabus not found" }, { status: 404 })
    }

    return NextResponse.json({ syllabus: rows[0] as DbSyllabusRow })
  } catch (error) {
    console.error("Error fetching syllabus:", error)
    return NextResponse.json(
      { error: "Failed to fetch syllabus" },
      { status: 500 }
    )
  }
}