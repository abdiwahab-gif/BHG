import { type NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { dbQuery } from "@/lib/db"
import { ensureStudentsTable } from "@/app/api/students/_db"

const analyticsFilterSchema = z.object({
  sessionId: z.string().optional(),
  semesterId: z.string().optional(),
  courseId: z.string().optional(),
  departmentId: z.string().optional(),
  examTypeId: z.string().optional(),
  dateFrom: z
    .string()
    .transform((val) => (val ? new Date(val) : undefined))
    .optional(),
  dateTo: z
    .string()
    .transform((val) => (val ? new Date(val) : undefined))
    .optional(),
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
      INDEX idx_isActive (isActive),
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
      INDEX idx_sessionId (sessionId),
      INDEX idx_name (name)
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
      INDEX idx_isPublished (isPublished),
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

function clampDate(value?: Date): Date | undefined {
  if (!value) return undefined
  return Number.isNaN(value.getTime()) ? undefined : value
}

function monthLabel(dateValue: any): string {
  const d = dateValue instanceof Date ? dateValue : new Date(String(dateValue))
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("en-US", { month: "short" })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filters = analyticsFilterSchema.parse(Object.fromEntries(searchParams))

    await ensureExamResultsTable()
    await ensureExamTypesTable()
    await ensureCoursesTable()
    await ensureSemestersTable()
    await ensureAttendanceTables()
    await ensureStudentsTable()

    const where: string[] = []
    const params: unknown[] = []

    if (filters.sessionId) {
      where.push("r.sessionId = ?")
      params.push(filters.sessionId)
    }
    if (filters.semesterId) {
      where.push("r.semesterId = ?")
      params.push(filters.semesterId)
    }
    if (filters.courseId) {
      where.push("r.courseId = ?")
      params.push(filters.courseId)
    }
    if (filters.examTypeId) {
      where.push("r.examTypeId = ?")
      params.push(filters.examTypeId)
    }

    const dateFrom = clampDate(filters.dateFrom)
    const dateTo = clampDate(filters.dateTo)
    if (dateFrom) {
      where.push("r.enteredAt >= ?")
      params.push(dateFrom)
    }
    if (dateTo) {
      where.push("r.enteredAt <= ?")
      params.push(dateTo)
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const overviewRows = await dbQuery<
      RowDataPacket & {
        totalExamResults: number
        publishedResults: number
        pendingResults: number
        averageGPA: number | null
        totalStudents: number
      }
    >(
      `SELECT
        COUNT(*) as totalExamResults,
        SUM(CASE WHEN r.isPublished = TRUE THEN 1 ELSE 0 END) as publishedResults,
        SUM(CASE WHEN r.isPublished = FALSE THEN 1 ELSE 0 END) as pendingResults,
        AVG(r.gradePoint) as averageGPA,
        COUNT(DISTINCT r.studentId) as totalStudents
      FROM academic_module_exam_results r
      ${whereSql}`,
      params,
    )

    const overview = overviewRows[0] || {
      totalExamResults: 0,
      publishedResults: 0,
      pendingResults: 0,
      averageGPA: null,
      totalStudents: 0,
    }

    const gradeRows = await dbQuery<RowDataPacket & { grade: string; count: number }>(
      `SELECT r.letterGrade as grade, COUNT(*) as count
       FROM academic_module_exam_results r
       ${whereSql}
       GROUP BY r.letterGrade
       ORDER BY count DESC`,
      params,
    )

    const gradeTotal = Number(overview.totalExamResults || 0)
    const gradeDistribution = (gradeRows || []).map((g) => {
      const count = Number((g as any).count || 0)
      return {
        grade: String((g as any).grade || ""),
        count,
        percentage: gradeTotal > 0 ? Math.round((count / gradeTotal) * 1000) / 10 : 0,
      }
    })

    const trendRows = await dbQuery<RowDataPacket & { monthKey: string; monthDate: any; averageGPA: number; totalStudents: number }>(
      `SELECT
        DATE_FORMAT(r.enteredAt, '%Y-%m') as monthKey,
        MIN(r.enteredAt) as monthDate,
        AVG(r.gradePoint) as averageGPA,
        COUNT(DISTINCT r.studentId) as totalStudents
      FROM academic_module_exam_results r
      ${whereSql}
      GROUP BY monthKey
      ORDER BY monthKey ASC
      LIMIT 24`,
      params,
    )

    const performanceTrends = (trendRows || []).map((t) => ({
      month: monthLabel((t as any).monthDate) || String((t as any).monthKey || ""),
      averageGPA: Number((t as any).averageGPA || 0),
      totalStudents: Number((t as any).totalStudents || 0),
    }))

    const courseRows = await dbQuery<
      RowDataPacket & {
        courseId: string
        courseName: string
        averageGPA: number
        totalStudents: number
        passCount: number
        totalExams: number
      }
    >(
      `SELECT
        r.courseId as courseId,
        COALESCE(c.name, '') as courseName,
        AVG(r.gradePoint) as averageGPA,
        COUNT(DISTINCT r.studentId) as totalStudents,
        SUM(CASE WHEN r.letterGrade <> 'F' THEN 1 ELSE 0 END) as passCount,
        COUNT(*) as totalExams
      FROM academic_module_exam_results r
      LEFT JOIN academic_module_courses c ON c.id = r.courseId
      ${whereSql}
      GROUP BY r.courseId, c.name
      ORDER BY totalStudents DESC
      LIMIT 10`,
      params,
    )

    const coursePerformance = (courseRows || []).map((c) => {
      const passCount = Number((c as any).passCount || 0)
      const totalExams = Number((c as any).totalExams || 0)
      return {
        courseCode: String((c as any).courseId || "").slice(0, 8),
        courseName: String((c as any).courseName || ""),
        averageGPA: Number((c as any).averageGPA || 0),
        totalStudents: Number((c as any).totalStudents || 0),
        passRate: totalExams > 0 ? Math.round((passCount / totalExams) * 1000) / 10 : 0,
      }
    })

    const examTypeRows = await dbQuery<RowDataPacket & { examType: string; averageScore: number; totalExams: number }>(
      `SELECT
        COALESCE(et.name, '') as examType,
        AVG(r.percentage) as averageScore,
        COUNT(*) as totalExams
      FROM academic_module_exam_results r
      LEFT JOIN academic_module_exam_types et ON et.id = r.examTypeId
      ${whereSql}
      GROUP BY et.name
      ORDER BY totalExams DESC`,
      params,
    )

    const examTypePerformance = (examTypeRows || []).map((e) => ({
      examType: String((e as any).examType || ""),
      averageScore: Number((e as any).averageScore || 0),
      totalExams: Number((e as any).totalExams || 0),
    }))

    // Map "department" to student className (best available in current schema)
    const deptRows = await dbQuery<RowDataPacket & { department: string; averageGPA: number; totalStudents: number }>(
      `SELECT
        COALESCE(s.className, '') as department,
        AVG(r.gradePoint) as averageGPA,
        COUNT(DISTINCT r.studentId) as totalStudents
      FROM academic_module_exam_results r
      LEFT JOIN academic_module_students s ON s.id = r.studentId
      ${whereSql}
      GROUP BY s.className
      ORDER BY totalStudents DESC
      LIMIT 10`,
      params,
    )

    const departmentComparison = (deptRows || []).map((d) => ({
      department: String((d as any).department || ""),
      averageGPA: Number((d as any).averageGPA || 0),
      totalStudents: Number((d as any).totalStudents || 0),
    }))

    // Attendance impact (optional): only compute when semesterId is provided so we can use date range.
    let attendanceImpact: Array<{ attendanceRange: string; averageGPA: number; studentCount: number }> = []
    if (filters.semesterId) {
      const semRows = await dbQuery<RowDataPacket & { startDate: any; endDate: any }>(
        "SELECT startDate, endDate FROM academic_module_semesters WHERE id = ? LIMIT 1",
        [filters.semesterId],
      )
      const startDate = semRows[0]?.startDate ? new Date(semRows[0].startDate) : null
      const endDate = semRows[0]?.endDate ? new Date(semRows[0].endDate) : null

      if (startDate && endDate && !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
        // Per-student GPA for this analytics scope (ignores attendance tables)
        const gpaByStudent = await dbQuery<RowDataPacket & { studentId: string; gpa: number }>(
          `SELECT r.studentId as studentId, AVG(r.gradePoint) as gpa
           FROM academic_module_exam_results r
           ${whereSql}
           GROUP BY r.studentId`,
          params,
        )

        // Attendance rate by student within semester dates
        const attendanceRows = await dbQuery<
          RowDataPacket & { studentId: string; total: number; present: number }
        >(
          `SELECT
            ar.studentId as studentId,
            COUNT(*) as total,
            SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present
          FROM academic_module_attendance_records ar
          INNER JOIN academic_module_attendance_sessions s ON s.id = ar.sessionId
          WHERE s.date >= ? AND s.date <= ?
          GROUP BY ar.studentId`,
          [startDate, endDate],
        )

        const attendanceMap = new Map<string, { total: number; present: number }>()
        for (const row of attendanceRows || []) {
          attendanceMap.set(String((row as any).studentId), {
            total: Number((row as any).total || 0),
            present: Number((row as any).present || 0),
          })
        }

        const buckets = [
          { label: "90-100%", min: 90 },
          { label: "80-89%", min: 80 },
          { label: "70-79%", min: 70 },
          { label: "60-69%", min: 60 },
          { label: "Below 60%", min: -1 },
        ] as const

        const acc = new Map<string, { sumGpa: number; count: number }>()
        for (const b of buckets) acc.set(b.label, { sumGpa: 0, count: 0 })

        for (const row of gpaByStudent || []) {
          const studentId = String((row as any).studentId)
          const gpa = Number((row as any).gpa || 0)
          const att = attendanceMap.get(studentId)
          if (!att || att.total <= 0) continue
          const rate = (att.present / att.total) * 100

          let label = "Below 60%"
          if (rate >= 90) label = "90-100%"
          else if (rate >= 80) label = "80-89%"
          else if (rate >= 70) label = "70-79%"
          else if (rate >= 60) label = "60-69%"

          const cur = acc.get(label)
          if (!cur) continue
          cur.sumGpa += gpa
          cur.count += 1
        }

        attendanceImpact = buckets.map((b) => {
          const cur = acc.get(b.label) || { sumGpa: 0, count: 0 }
          return {
            attendanceRange: b.label,
            averageGPA: cur.count > 0 ? Math.round((cur.sumGpa / cur.count) * 100) / 100 : 0,
            studentCount: cur.count,
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalStudents: Number(overview.totalStudents || 0),
          totalExamResults: Number(overview.totalExamResults || 0),
          averageGPA: Number(overview.averageGPA || 0),
          publishedResults: Number(overview.publishedResults || 0),
          pendingResults: Number(overview.pendingResults || 0),
        },
        gradeDistribution,
        performanceTrends,
        coursePerformance,
        examTypePerformance,
        departmentComparison,
        attendanceImpact,
      },
      filters,
      generatedAt: new Date(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid filters", details: error.errors }, { status: 400 })
    }

    console.error("Error fetching analytics:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch analytics" }, { status: 500 })
  }
}
