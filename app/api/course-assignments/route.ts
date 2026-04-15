import { NextRequest, NextResponse } from "next/server"
import { dbQuery } from "@/lib/db"

async function ensureAssignmentsTable(): Promise<void> {
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

  const photoTypeRows = await dbQuery<any>(
    "SELECT DATA_TYPE as dataType FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'academic_module_teachers' AND COLUMN_NAME = 'photo' LIMIT 1",
    []
  )

  const dataType = String(photoTypeRows?.[0]?.dataType || "").toLowerCase()
  if (dataType && dataType !== "mediumtext") {
    await dbQuery("ALTER TABLE academic_module_teachers MODIFY COLUMN photo MEDIUMTEXT NULL", [])
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureAssignmentsTable()
    await ensureCoursesTable()
    await ensureTeachersTable()

    const body = await request.json().catch(() => null)
    const teacherId = typeof body?.teacherId === "string" ? body.teacherId.trim() : ""
    const courseId = typeof body?.courseId === "string" ? body.courseId.trim() : ""

    if (!teacherId || !courseId) {
      return NextResponse.json(
        { success: false, message: "teacherId and courseId are required" },
        { status: 400 }
      )
    }

    const courseRows = await dbQuery<any>("SELECT id, name FROM academic_module_courses WHERE id = ? LIMIT 1", [
      courseId,
    ])
    if (courseRows.length === 0) {
      return NextResponse.json({ success: false, message: "Course not found" }, { status: 404 })
    }

    const teacherRows = await dbQuery<any>(
      "SELECT id, firstName, lastName FROM academic_module_teachers WHERE id = ? LIMIT 1",
      [teacherId]
    )
    if (teacherRows.length === 0) {
      return NextResponse.json({ success: false, message: "Teacher not found" }, { status: 404 })
    }

    await dbQuery(
      "INSERT INTO academic_module_course_teacher_assignments (id, courseId, teacherId) VALUES (UUID(), ?, ?) ON DUPLICATE KEY UPDATE teacherId = VALUES(teacherId)",
      [courseId, teacherId]
    )

    const rows = await dbQuery<any>(
      "SELECT id, courseId, teacherId, createdAt, updatedAt FROM academic_module_course_teacher_assignments WHERE courseId = ? LIMIT 1",
      [courseId]
    )

    return NextResponse.json({
      success: true,
      message: "Teacher assigned successfully",
      data: {
        assignment: rows[0] || null,
        course: courseRows[0] || null,
      },
    })
  } catch (error) {
    console.error("[POST /api/course-assignments]", error)
    const message = error instanceof Error ? error.message : "Failed to assign teacher"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
