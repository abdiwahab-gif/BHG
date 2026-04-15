import { type NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"

import { dbQuery } from "@/lib/db"
import { ensureStudentsTable } from "@/app/api/students/_db"

const filtersSchema = z.object({
  sessionId: z.string().optional(),
  semesterId: z.string().optional(),
  courseId: z.string().optional(),
})

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
    [],
  )
}

async function ensureSemestersTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_semesters (
      id VARCHAR(36) PRIMARY KEY,
      sessionId VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_sessionId (sessionId)
    ) ENGINE=InnoDB`,
    [],
  )
}

async function ensureExamTypesTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_exam_types (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(30) NOT NULL,
      weight DECIMAL(6,2) NOT NULL DEFAULT 0,
      description TEXT NULL,
      isActive BOOLEAN NOT NULL DEFAULT TRUE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_code (code),
      INDEX idx_isActive (isActive)
    ) ENGINE=InnoDB`,
    [],
  )
}

async function ensureExamResultsTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_exam_results (
      id VARCHAR(36) PRIMARY KEY,
      studentId VARCHAR(36) NOT NULL,
      courseId VARCHAR(36) NOT NULL,
      examTypeId VARCHAR(36) NOT NULL,
      sessionId VARCHAR(36) NOT NULL,
      semesterId VARCHAR(36) NOT NULL,
      score DECIMAL(10,2) NOT NULL,
      maxScore DECIMAL(10,2) NOT NULL,
      percentage DECIMAL(6,2) NOT NULL,
      gradePoint DECIMAL(4,2) NOT NULL,
      letterGrade VARCHAR(3) NOT NULL,
      comments TEXT NULL,
      isPublished BOOLEAN NOT NULL DEFAULT FALSE,
      enteredBy VARCHAR(255) NOT NULL,
      enteredAt DATETIME NOT NULL,
      modifiedBy VARCHAR(255) NULL,
      modifiedAt DATETIME NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_studentId (studentId),
      INDEX idx_courseId (courseId),
      INDEX idx_examTypeId (examTypeId),
      INDEX idx_session_semester (sessionId, semesterId),
      INDEX idx_enteredAt (enteredAt)
    ) ENGINE=InnoDB`,
    [],
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
      INDEX idx_courseId (courseId),
      INDEX idx_classId (classId),
      INDEX idx_date (date)
    ) ENGINE=InnoDB`,
    [],
  )

  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_attendance_records (
      id VARCHAR(36) PRIMARY KEY,
      sessionId VARCHAR(36) NOT NULL,
      studentId VARCHAR(36) NOT NULL,
      status VARCHAR(20) NOT NULL,
      notes TEXT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_sessionId (sessionId),
      INDEX idx_studentId (studentId),
      INDEX idx_status (status)
    ) ENGINE=InnoDB`,
    [],
  )
}

function toIsoDate(value: unknown): string {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest, { params }: { params: { studentId: string } }) {
  try {
    const { studentId } = params

    const { searchParams } = new URL(request.url)
    const filters = filtersSchema.parse(Object.fromEntries(searchParams))

    await ensureExamResultsTable()
    await ensureExamTypesTable()
    await ensureCoursesTable()
    await ensureSemestersTable()
    await ensureAttendanceTables()
    await ensureStudentsTable()

    const studentRows = await dbQuery<
      RowDataPacket & {
        id: string
        firstName: string
        lastName: string
        studentIdNumber: string
        className: string
      }
    >(
      `SELECT id, firstName, lastName, studentId as studentIdNumber, className
       FROM academic_module_students
       WHERE id = ?
       LIMIT 1`,
      [studentId],
    )

    if (!studentRows.length) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 })
    }

    const where: string[] = ["r.studentId = ?"]
    const queryParams: unknown[] = [studentId]

    if (filters.sessionId) {
      where.push("r.sessionId = ?")
      queryParams.push(filters.sessionId)
    }
    if (filters.semesterId) {
      where.push("r.semesterId = ?")
      queryParams.push(filters.semesterId)
    }
    if (filters.courseId) {
      where.push("r.courseId = ?")
      queryParams.push(filters.courseId)
    }

    const whereSql = `WHERE ${where.join(" AND ")}`

    const currentRows = await dbQuery<RowDataPacket & { currentGPA: number | null }>(
      `SELECT AVG(r.gradePoint) as currentGPA
       FROM academic_module_exam_results r
       ${whereSql}`,
      queryParams,
    )
    const currentGPA = Number(currentRows[0]?.currentGPA || 0)

    const cgpaRows = await dbQuery<RowDataPacket & { currentCGPA: number | null }>(
      `SELECT AVG(gradePoint) as currentCGPA
       FROM academic_module_exam_results
       WHERE studentId = ?`,
      [studentId],
    )
    const currentCGPA = Number(cgpaRows[0]?.currentCGPA || 0)

    const semesterWhere: string[] = ["r.studentId = ?"]
    const semesterParams: unknown[] = [studentId]
    if (filters.sessionId) {
      semesterWhere.push("r.sessionId = ?")
      semesterParams.push(filters.sessionId)
    }

    const semesterGPARows = await dbQuery<
      RowDataPacket & { semesterId: string; semester: string; gpa: number; startDate: any }
    >(
      `SELECT
        r.semesterId as semesterId,
        COALESCE(sem.name, '') as semester,
        AVG(r.gradePoint) as gpa,
        MIN(sem.startDate) as startDate
      FROM academic_module_exam_results r
      LEFT JOIN academic_module_semesters sem ON sem.id = r.semesterId
      WHERE ${semesterWhere.join(" AND ")}
      GROUP BY r.semesterId, sem.name
      ORDER BY startDate ASC
      LIMIT 24`,
      semesterParams,
    )

    const semesterGPAs = (semesterGPARows || []).map((r) => ({
      semester: String((r as any).semester || ""),
      gpa: Math.round(Number((r as any).gpa || 0) * 100) / 100,
      credits: 0,
    }))

    type FlatExamRow = RowDataPacket & {
      courseId: string
      courseName: string | null
      examTypeName: string | null
      weight: number | null
      score: number
      maxScore: number
      percentage: number
      gradePoint: number
      letterGrade: string
      enteredAt: any
      semesterName: string | null
      semesterId: string
    }

    const examRows = await dbQuery<FlatExamRow>(
      `SELECT
        r.courseId as courseId,
        c.name as courseName,
        et.name as examTypeName,
        et.weight as weight,
        r.score as score,
        r.maxScore as maxScore,
        r.percentage as percentage,
        r.gradePoint as gradePoint,
        r.letterGrade as letterGrade,
        r.enteredAt as enteredAt,
        sem.name as semesterName,
        r.semesterId as semesterId
      FROM academic_module_exam_results r
      LEFT JOIN academic_module_courses c ON c.id = r.courseId
      LEFT JOIN academic_module_exam_types et ON et.id = r.examTypeId
      LEFT JOIN academic_module_semesters sem ON sem.id = r.semesterId
      ${whereSql}
      ORDER BY r.enteredAt DESC
      LIMIT 500`,
      queryParams,
    )

    const perCourse = new Map<
      string,
      {
        courseId: string
        courseName: string
        examResults: Array<{ examType: string; score: number; maxScore: number; weight: number }>
        gpaSum: number
        gpaCount: number
        lastLetterGrade: string
      }
    >()

    const perExamTypeTrend = new Map<string, number[]>()

    for (const row of examRows || []) {
      const courseId = String((row as any).courseId)
      const courseName = String((row as any).courseName || "")
      const examType = String((row as any).examTypeName || "")
      const weight = Number((row as any).weight || 0)
      const score = Number((row as any).score || 0)
      const maxScore = Number((row as any).maxScore || 0)
      const percentage = Number((row as any).percentage || 0)
      const gradePoint = Number((row as any).gradePoint || 0)
      const letterGrade = String((row as any).letterGrade || "")

      if (!perCourse.has(courseId)) {
        perCourse.set(courseId, {
          courseId,
          courseName,
          examResults: [],
          gpaSum: 0,
          gpaCount: 0,
          lastLetterGrade: letterGrade,
        })
      }
      const course = perCourse.get(courseId)!
      course.examResults.push({ examType, score, maxScore, weight })
      course.gpaSum += gradePoint
      course.gpaCount += 1
      course.lastLetterGrade = course.lastLetterGrade || letterGrade

      if (examType) {
        const list = perExamTypeTrend.get(examType) || []
        // We are iterating DESC by enteredAt, unshift so trend is oldest->newest
        list.unshift(Math.round(percentage * 10) / 10)
        // Keep last 5
        while (list.length > 5) list.shift()
        perExamTypeTrend.set(examType, list)
      }
    }

    // Attendance per course (only when semesterId provided so we can derive date range)
    const attendanceByCourse = new Map<string, number>()
    if (filters.semesterId) {
      const semRows = await dbQuery<RowDataPacket & { startDate: any; endDate: any }>(
        "SELECT startDate, endDate FROM academic_module_semesters WHERE id = ? LIMIT 1",
        [filters.semesterId],
      )
      const startDate = semRows[0]?.startDate ? new Date(semRows[0].startDate) : null
      const endDate = semRows[0]?.endDate ? new Date(semRows[0].endDate) : null

      if (startDate && endDate && !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
        const attRows = await dbQuery<RowDataPacket & { courseId: string; total: number; present: number }>(
          `SELECT
            s.courseId as courseId,
            COUNT(*) as total,
            SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present
          FROM academic_module_attendance_records ar
          INNER JOIN academic_module_attendance_sessions s ON s.id = ar.sessionId
          WHERE ar.studentId = ? AND s.date >= ? AND s.date <= ?
          GROUP BY s.courseId`,
          [studentId, startDate, endDate],
        )
        for (const r of attRows || []) {
          const total = Number((r as any).total || 0)
          const present = Number((r as any).present || 0)
          attendanceByCourse.set(String((r as any).courseId), total > 0 ? Math.round((present / total) * 100) : 0)
        }
      }
    }

    const coursePerformance = [...perCourse.values()].map((c) => {
      const gradePoint = c.gpaCount > 0 ? c.gpaSum / c.gpaCount : 0
      return {
        courseCode: c.courseId.slice(0, 8),
        courseName: c.courseName,
        credits: 0,
        examResults: c.examResults,
        finalGrade: c.lastLetterGrade,
        gradePoint: Math.round(gradePoint * 100) / 100,
        attendance: attendanceByCourse.get(c.courseId) ?? 0,
      }
    })

    // Basic strengths/improvements from course gradePoint
    const sortedCourses = [...coursePerformance].sort((a, b) => b.gradePoint - a.gradePoint)
    const strengths = sortedCourses.slice(0, 3).map((c) => c.courseName).filter(Boolean)
    const improvements = sortedCourses.slice(-2).map((c) => c.courseName).filter(Boolean)

    const performanceTrends = [...perExamTypeTrend.entries()].map(([examType, trend]) => ({
      examType,
      trend,
    }))

    const student = studentRows[0]
    const studentName = `${String((student as any).firstName || "")} ${String((student as any).lastName || "")}`.trim()

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: String((student as any).id),
          name: studentName,
          studentNumber: String((student as any).studentIdNumber || ""),
          program: String((student as any).className || ""),
          department: String((student as any).className || ""),
        },
        currentGPA: Math.round(currentGPA * 100) / 100,
        currentCGPA: Math.round(currentCGPA * 100) / 100,
        semesterGPAs,
        coursePerformance,
        performanceTrends,
        strengths,
        improvements,
        recommendations: [],
        // Extra helpful fields (non-breaking for consumers that ignore them)
        filters,
        generatedAt: new Date(),
      },
      generatedAt: new Date(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid filters", details: error.errors }, { status: 400 })
    }

    console.error("Error fetching student performance:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch student performance" }, { status: 500 })
  }
}
