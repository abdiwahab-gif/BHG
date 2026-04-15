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

type DbStudentRow = RowDataPacket & {
  id: string
  firstName: string
  lastName: string
  studentId: string
  className: string
  sectionName: string | null
}

type DbRecordRow = RowDataPacket & {
  id: string
  sessionId: string
  studentId: string
  status: "present" | "absent" | "late"
  notes: string | null
  createdAt: Date | string
  updatedAt: Date | string
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
  // keep YYYY-MM-DD if valid
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
       r.createdAt,
       r.updatedAt,
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

export async function GET(request: NextRequest) {
  try {
    await ensureClassesTable()
    await ensureCoursesTable()
    await ensureStudentsTable()
    await ensureAttendanceTables()

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    const classId = searchParams.get("classId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    const safePage = Number.isFinite(page) && page > 0 ? page : 1
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 10
    const offset = (safePage - 1) * safeLimit

    const where: string[] = []
    const params: any[] = []

    if (courseId) {
      where.push("s.courseId = ?")
      params.push(courseId)
    }
    if (classId) {
      where.push("s.classId = ?")
      params.push(classId)
    }
    if (startDate) {
      where.push("s.date >= ?")
      params.push(startDate)
    }
    if (endDate) {
      where.push("s.date <= ?")
      params.push(endDate)
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const countRows = await dbQuery<any>(
      `SELECT COUNT(*) as total FROM academic_module_attendance_sessions s ${whereSql}`,
      params
    )
    const total = Number(countRows?.[0]?.total ?? 0)

    const sessionRows = await dbQuery<DbSessionRow>(
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
       ${whereSql}
       GROUP BY s.id
       ORDER BY s.date DESC, s.takenAt DESC
       LIMIT ${safeLimit} OFFSET ${offset}`,
      params
    )

    const sessions: AttendanceSession[] = []
    for (const row of sessionRows || []) {
      const students = await getStudentsForSession(row.id)
      sessions.push({
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
        students,
      })
    }

    return NextResponse.json({
      sessions,
      total,
      page: safePage,
      limit: safeLimit,
    })
  } catch (error) {
    console.error("Error fetching attendance sessions:", error)
    return NextResponse.json(
      { error: "Failed to fetch attendance sessions" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureClassesTable()
    await ensureCoursesTable()
    await ensureStudentsTable()
    await ensureAttendanceTables()

    const body = await request.json().catch(() => null)
    const courseId = body?.courseId
    const classId = body?.classId
    const date = body?.date
    const students: StudentAttendance[] | undefined = body?.students
    const notes = typeof body?.notes === "string" ? body.notes : ""

    if (!courseId || !classId || !date || !Array.isArray(students)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const classRows = await dbQuery<any>(
      "SELECT id, name FROM academic_module_classes WHERE id = ? LIMIT 1",
      [classId]
    )
    const courseRows = await dbQuery<any>(
      "SELECT id, name FROM academic_module_courses WHERE id = ? LIMIT 1",
      [courseId]
    )

    if (!classRows?.[0] || !courseRows?.[0]) {
      return NextResponse.json(
        { error: "Invalid class or course selection" },
        { status: 400 }
      )
    }

    const sessionId = crypto.randomUUID()
    const takenBy = "Current Teacher"
    const takenAt = new Date()

    await dbQuery(
      "INSERT INTO academic_module_attendance_sessions (id, courseId, classId, date, takenBy, takenAt, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [sessionId, courseId, classId, date, takenBy, takenAt, notes]
    )

    for (const student of students) {
      if (!student?.studentId) continue
      const recordId = crypto.randomUUID()
      const status = student.status
      const recordNotes = typeof student.notes === "string" ? student.notes : ""
      await dbQuery(
        "INSERT INTO academic_module_attendance_records (id, sessionId, studentId, status, notes) VALUES (?, ?, ?, ?, ?)",
        [recordId, sessionId, student.studentId, status, recordNotes]
      )
    }

    const sessionRows = await dbQuery<DbSessionRow>(
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

    const row = sessionRows?.[0]
    const session: AttendanceSession | null = row
      ? {
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
      : null

    return NextResponse.json({ message: "Attendance recorded successfully", session })
  } catch (error) {
    console.error("Error recording attendance:", error)
    return NextResponse.json(
      { error: "Failed to record attendance" },
      { status: 500 }
    )
  }
}
