import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { dbQuery } from "@/lib/db"

type DbClassCourseRow = RowDataPacket & {
  id: string
  name: string
  type: string
  credits: number | null
  teacherId: string | null
  teacherName: string | null
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

async function ensureTeachersTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_teachers (
      id VARCHAR(36) PRIMARY KEY,
      firstName VARCHAR(100) NOT NULL,
      lastName VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      gender VARCHAR(20) NOT NULL,
      nationality VARCHAR(100) NOT NULL,
      address VARCHAR(255) NOT NULL,
      address2 VARCHAR(255) NULL,
      city VARCHAR(100) NOT NULL,
      zip VARCHAR(20) NOT NULL,
      photo MEDIUMTEXT NULL,
      subjects TEXT NULL,
      qualifications TEXT NULL,
      experience VARCHAR(50) NULL,
      joiningDate DATE NULL,
      salary DECIMAL(12,2) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_email (email),
      INDEX idx_status (status),
      INDEX idx_name (lastName, firstName)
    ) ENGINE=InnoDB`,
    []
  )
}

async function ensureCourseTeacherAssignmentsTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_course_teacher_assignments (
      id VARCHAR(36) PRIMARY KEY,
      courseId VARCHAR(36) NOT NULL,
      teacherId VARCHAR(36) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_course (courseId),
      INDEX idx_teacherId (teacherId)
    ) ENGINE=InnoDB`,
    []
  )
}

async function ensureClassCoursesTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_class_courses (
      id VARCHAR(36) PRIMARY KEY,
      classId VARCHAR(36) NOT NULL,
      courseId VARCHAR(36) NOT NULL,
      credits INT NULL,
      isActive BOOLEAN NOT NULL DEFAULT TRUE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_class_course (classId, courseId),
      INDEX idx_classId (classId),
      INDEX idx_courseId (courseId),
      INDEX idx_isActive (isActive)
    ) ENGINE=InnoDB`,
    []
  )
}

function normalizeCourseType(type: unknown): "General" | "Elective" {
  const t = String(type || "").toLowerCase()
  if (t === "elective") return "Elective"
  // DB uses Core/Elective; UI currently expects General/Elective
  return "General"
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureClassesTable()
    await ensureCoursesTable()
    await ensureTeachersTable()
    await ensureCourseTeacherAssignmentsTable()
    await ensureClassCoursesTable()

    const { id: classId } = await params
    if (!classId) {
      return NextResponse.json({ success: false, message: "classId is required" }, { status: 400 })
    }

    // Ensure class exists (helps catch UI bugs early)
    const classRows = await dbQuery<any>("SELECT id FROM academic_module_classes WHERE id = ? LIMIT 1", [classId])
    if (!classRows?.[0]?.id) {
      return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 })
    }

    const rows = await dbQuery<DbClassCourseRow>(
      `SELECT
         c.id,
         c.name,
         c.type,
         cc.credits,
         a.teacherId,
         CONCAT(t.firstName, ' ', t.lastName) as teacherName
       FROM academic_module_class_courses cc
       INNER JOIN academic_module_courses c ON c.id = cc.courseId
       LEFT JOIN academic_module_course_teacher_assignments a ON a.courseId = c.id
       LEFT JOIN academic_module_teachers t ON t.id = a.teacherId
       WHERE cc.classId = ? AND cc.isActive = TRUE
       ORDER BY c.name ASC`,
      [classId]
    )

    const data = (rows || []).map((r) => ({
      id: String(r.id),
      name: String(r.name),
      type: normalizeCourseType(r.type),
      credits: r.credits == null ? 3 : Number(r.credits),
      teacherId: r.teacherId ? String(r.teacherId) : undefined,
      teacherName: r.teacherName ? String(r.teacherName) : undefined,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[GET /api/classes/:id/courses]", error)
    const message = error instanceof Error ? error.message : "Failed to fetch class courses"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
