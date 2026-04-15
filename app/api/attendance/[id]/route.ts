import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import type { RowDataPacket } from "mysql2/promise"
import { dbQuery } from "@/lib/db"
import { ensureStudentsTable } from "@/app/api/students/_db"
import type { AttendanceSession, StudentAttendance } from "@/types/attendance"

type DbSessionRow = RowDataPacket & {
  id: string
  courseId: string
  courseName: string | null
  classId: string
  className: string | null
  date: Date | string
  takenBy: string
  takenAt: Date | string
  notes: string | null
  createdAt: Date | string
  updatedAt: Date | string
  totalStudents: number
  presentCount: number
  absentCount: number
  lateCount: number
}

type DbRecordRow = RowDataPacket & {
  id: string
  sessionId: string
  studentId: string
  status: "present" | "absent" | "late"
  notes: string | null
  studentName: string
  rollNumber: string
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

async function ensureAttendanceTables(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_attendance_sessions (
      id VARCHAR(36) PRIMARY KEY,
      courseId VARCHAR(36) NOT NULL,
      classId VARCHAR(36) NOT NULL,
      date DATE NOT NULL,
      takenBy VARCHAR(255) NOT NULL,
      takenAt DATETIME NOT NULL,
      notes TEXT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_session (courseId, classId, date),
      INDEX idx_courseId (courseId),
      INDEX idx_classId (classId),
      INDEX idx_date (date)
    ) ENGINE=InnoDB`,
    []
  )

  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_attendance_records (
      id VARCHAR(36) PRIMARY KEY,
      sessionId VARCHAR(36) NOT NULL,
      studentId VARCHAR(36) NOT NULL,
      status VARCHAR(10) NOT NULL,
      notes TEXT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_record (sessionId, studentId),
      INDEX idx_sessionId (sessionId),
      INDEX idx_studentId (studentId),
      INDEX idx_status (status)
    ) ENGINE=InnoDB`,
    []
  )
}

function toIso(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString()
  if (value instanceof Date) return value.toISOString()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function toDateOnly(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

async function getStudentsForSession(sessionId: string): Promise<StudentAttendance[]> {
  const rows = await dbQuery<DbRecordRow>(
    `SELECT
       r.id,
       r.sessionId,
       r.studentId,
       r.status,
       r.notes,
       CONCAT(s.firstName, ' ', s.lastName) as studentName,
       s.studentId as rollNumber
     FROM academic_module_attendance_records r
     LEFT JOIN academic_module_students s ON s.id = r.studentId
     WHERE r.sessionId = ?
     ORDER BY s.studentId ASC`,
    [sessionId]
  )

  return (rows || []).map((row) => ({
    id: row.id,
    studentId: row.studentId,
    studentName: row.studentName || "",
    rollNumber: row.rollNumber || "",
    status: row.status,
    notes: row.notes || "",
  }))
}

async function getSession(sessionId: string): Promise<AttendanceSession | null> {
  const rows = await dbQuery<DbSessionRow>(
    `SELECT
       s.id,
       s.courseId,
       crs.name as courseName,
       s.classId,
       c.name as className,
       s.date,
       s.takenBy,
       s.takenAt,
       s.notes,
       s.createdAt,
       s.updatedAt,
       COUNT(r.id) as totalStudents,
       SUM(CASE WHEN r.status = 'present' THEN 1 ELSE 0 END) as presentCount,
       SUM(CASE WHEN r.status = 'absent' THEN 1 ELSE 0 END) as absentCount,
       SUM(CASE WHEN r.status = 'late' THEN 1 ELSE 0 END) as lateCount
     FROM academic_module_attendance_sessions s
     LEFT JOIN academic_module_courses crs ON crs.id = s.courseId
     LEFT JOIN academic_module_classes c ON c.id = s.classId
     LEFT JOIN academic_module_attendance_records r ON r.sessionId = s.id
     WHERE s.id = ?
     GROUP BY s.id
     LIMIT 1`,
    [sessionId]
  )

  const row = rows?.[0]
  if (!row) return null

  return {
    id: row.id,
    courseId: row.courseId,
    courseName: row.courseName ? String(row.courseName) : "",
    classId: row.classId,
    className: row.className ? String(row.className) : "",
    date: toDateOnly(String(row.date)),
    totalStudents: Number(row.totalStudents || 0),
    presentCount: Number(row.presentCount || 0),
    absentCount: Number(row.absentCount || 0),
    lateCount: Number(row.lateCount || 0),
    takenBy: row.takenBy,
    takenAt: toIso(row.takenAt),
    createdAt: toIso(row.createdAt),
    notes: row.notes || "",
    students: await getStudentsForSession(row.id),
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureClassesTable()
    await ensureCoursesTable()
    await ensureStudentsTable()
    await ensureAttendanceTables()

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Missing session id" }, { status: 400 })
    }

    const session = await getSession(id)
    if (!session) {
      return NextResponse.json({ error: "Attendance session not found" }, { status: 404 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error("Error fetching attendance session:", error)
    return NextResponse.json(
      { error: "Failed to fetch attendance session" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureClassesTable()
    await ensureCoursesTable()
    await ensureStudentsTable()
    await ensureAttendanceTables()

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Missing session id" }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    const students: StudentAttendance[] | undefined = body?.students
    const notes = typeof body?.notes === "string" ? body.notes : undefined

    const existing = await getSession(id)
    if (!existing) {
      return NextResponse.json({ error: "Attendance session not found" }, { status: 404 })
    }

    if (!Array.isArray(students) && notes === undefined) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }

    if (notes !== undefined) {
      await dbQuery("UPDATE academic_module_attendance_sessions SET notes = ? WHERE id = ?", [notes, id])
    }

    if (Array.isArray(students)) {
      await dbQuery("DELETE FROM academic_module_attendance_records WHERE sessionId = ?", [id])
      for (const student of students) {
        if (!student?.studentId) continue
        const recordId = crypto.randomUUID()
        const status = student.status
        const recordNotes = typeof student.notes === "string" ? student.notes : ""
        await dbQuery(
          "INSERT INTO academic_module_attendance_records (id, sessionId, studentId, status, notes) VALUES (?, ?, ?, ?, ?)",
          [recordId, id, student.studentId, status, recordNotes]
        )
      }
    }

    const updated = await getSession(id)
    return NextResponse.json({ message: "Attendance session updated successfully", session: updated })
  } catch (error) {
    console.error("Error updating attendance session:", error)
    return NextResponse.json(
      { error: "Failed to update attendance session" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureClassesTable()
    await ensureCoursesTable()
    await ensureStudentsTable()
    await ensureAttendanceTables()

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Missing session id" }, { status: 400 })
    }

    const existing = await getSession(id)
    if (!existing) {
      return NextResponse.json({ error: "Attendance session not found" }, { status: 404 })
    }

    await dbQuery("DELETE FROM academic_module_attendance_records WHERE sessionId = ?", [id])
    await dbQuery("DELETE FROM academic_module_attendance_sessions WHERE id = ?", [id])

    return NextResponse.json({ message: "Attendance session deleted successfully", session: existing })
  } catch (error) {
    console.error("Error deleting attendance session:", error)
    return NextResponse.json(
      { error: "Failed to delete attendance session" },
      { status: 500 }
    )
  }
}
