import { type NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { dbQuery } from "@/lib/db"
import { ensureStudentsTable } from "@/app/api/students/_db"

type DbStudentRow = RowDataPacket & {
  id: string
  firstName: string
  lastName: string
  studentId: string
  className: string
  sectionName: string
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

export async function GET(request: NextRequest) {
  try {
    await ensureClassesTable()
    await ensureStudentsTable()

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get("classId")

    if (!classId) {
      return NextResponse.json({ error: "Class ID is required" }, { status: 400 })
    }

    const classRows = await dbQuery<any>(
      "SELECT id, name FROM academic_module_classes WHERE id = ? LIMIT 1",
      [classId]
    )

    if (!classRows?.[0]?.name) {
      return NextResponse.json({ error: "Invalid class" }, { status: 400 })
    }

    const className = String(classRows[0].name)

    const studentRows = await dbQuery<DbStudentRow>(
      `SELECT id, firstName, lastName, studentId, className, sectionName
       FROM academic_module_students
       WHERE className = ?
       ORDER BY studentId ASC`,
      [className]
    )

    const studentsWithStatus = (studentRows || []).map((student) => ({
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      rollNumber: String(student.studentId || ""),
      status: "present" as const,
      notes: "",
    }))

    return NextResponse.json({
      students: studentsWithStatus,
      total: studentsWithStatus.length,
    })
  } catch (error) {
    console.error("Error fetching students:", error)
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    )
  }
}
