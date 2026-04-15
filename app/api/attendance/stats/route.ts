import { type NextRequest, NextResponse } from "next/server"
import { dbQuery } from "@/lib/db"

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

export async function GET(request: NextRequest) {
  try {
    await ensureAttendanceTables()

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    const classId = searchParams.get("classId")

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

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const rows = await dbQuery<any>(
      `SELECT
         COUNT(DISTINCT s.id) as totalSessions,
         SUM(CASE WHEN r.status = 'present' THEN 1 ELSE 0 END) as totalPresent,
         SUM(CASE WHEN r.status = 'absent' THEN 1 ELSE 0 END) as totalAbsent,
         SUM(CASE WHEN r.status = 'late' THEN 1 ELSE 0 END) as totalLate,
         COUNT(r.id) as totalRecords
       FROM academic_module_attendance_sessions s
       LEFT JOIN academic_module_attendance_records r ON r.sessionId = s.id
       ${whereSql}`,
      params
    )

    const totalSessions = Number(rows?.[0]?.totalSessions ?? 0)
    const totalPresent = Number(rows?.[0]?.totalPresent ?? 0)
    const totalAbsent = Number(rows?.[0]?.totalAbsent ?? 0)
    const totalLate = Number(rows?.[0]?.totalLate ?? 0)
    const totalRecords = Number(rows?.[0]?.totalRecords ?? 0)

    const attendanceRate = totalRecords
      ? Math.round((totalPresent / totalRecords) * 100)
      : 0

    return NextResponse.json({
      totalSessions,
      totalPresent,
      totalAbsent,
      totalLate,
      attendanceRate,
    })
  } catch (error) {
    console.error("Error fetching attendance statistics:", error)
    return NextResponse.json(
      { error: "Failed to fetch attendance statistics" },
      { status: 500 }
    )
  }
}
