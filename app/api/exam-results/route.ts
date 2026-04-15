import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { dbQuery } from "@/lib/db"
import { ensureStudentsTable } from "@/app/api/students/_db"
import { ensureCoursesTable } from "@/app/api/courses/_db"

const examResultSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  courseId: z.string().min(1, "Course ID is required"),
  examTypeId: z.string().min(1, "Exam type ID is required"),
  sessionId: z.string().min(1, "Session ID is required"),
  semesterId: z.string().min(1, "Semester ID is required"),
  score: z.number().min(0, "Score must be non-negative"),
  maxScore: z.number().min(1, "Max score must be positive"),
  comments: z.string().optional(),
})

const filterSchema = z.object({
  studentId: z.string().optional(),
  courseId: z.string().optional(),
  faculty: z.string().optional(),
  department: z.string().optional(),
  examTypeId: z.string().optional(),
  sessionId: z.string().optional(),
  semesterId: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  grade: z.string().optional(),
  isPublished: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  page: z
    .string()
    .transform((val) => Number.parseInt(val) || 1)
    .optional(),
  limit: z
    .string()
    .transform((val) => Number.parseInt(val) || 10)
    .optional(),
})

type DbExamResultRow = RowDataPacket & {
  id: string
  studentId: string
  courseId: string
  examTypeId: string
  sessionId: string
  semesterId: string
  score: number
  maxScore: number
  percentage: number
  gradePoint: number
  letterGrade: string
  comments: string | null
  isPublished: number | boolean
  enteredBy: string
  enteredAt: Date | string
  modifiedBy: string | null
  modifiedAt: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string

  studentName: string | null
  studentNumber: string | null
  studentGender: string | null
  courseName: string | null
  courseType: string | null
  courseCode: string | null
  courseCredits: number | null
  courseFaculty: string | null
  courseDepartment: string | null
  examTypeName: string | null
  examTypeCode: string | null
}

function normalizeExamTypeCodeForOutput(code: string): string {
  const upper = String(code || "").trim().toUpperCase()
  if (upper === "ASSIGN") return "ASSIGNMENT"
  if (upper === "ATT") return "ATTENDANCE"
  if (upper === "MIDTERM") return "MID"
  return upper
}


async function ensureSessionsTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      isActive BOOLEAN DEFAULT FALSE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_isActive (isActive)
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

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(Math.max(Math.trunc(value), min), max)
}

export async function GET(request: NextRequest) {
  try {
    await ensureExamResultsTable()
    await ensureExamTypesTable()
    await ensureCoursesTable()
    await ensureSessionsTable()
    await ensureSemestersTable()
    await ensureStudentsTable()

    const { searchParams } = new URL(request.url)
    const filters = filterSchema.parse(Object.fromEntries(searchParams))

    const where: string[] = []
    const params: unknown[] = []

    if (filters.studentId) {
      where.push("r.studentId = ?")
      params.push(filters.studentId)
    }
    if (filters.courseId) {
      where.push("r.courseId = ?")
      params.push(filters.courseId)
    }

    if (filters.faculty) {
      where.push("c.faculty = ?")
      params.push(filters.faculty)
    }

    if (filters.department) {
      where.push("c.department = ?")
      params.push(filters.department)
    }
    if (filters.examTypeId) {
      where.push("r.examTypeId = ?")
      params.push(filters.examTypeId)
    }
    if (filters.sessionId) {
      where.push("r.sessionId = ?")
      params.push(filters.sessionId)
    }
    if (filters.semesterId) {
      where.push("r.semesterId = ?")
      params.push(filters.semesterId)
    }

    const status = (filters.status || "").trim().toLowerCase()
    if (status === "published") {
      where.push("r.isPublished = TRUE")
    } else if (status === "pending" || status === "draft") {
      where.push("r.isPublished = FALSE")
    }

    if (filters.isPublished !== undefined) {
      where.push("r.isPublished = ?")
      params.push(filters.isPublished)
    }

    if (filters.grade) {
      where.push("r.letterGrade = ?")
      params.push(filters.grade)
    }

    if (filters.search) {
      const like = `%${filters.search}%`
      where.push(
        "(s.firstName LIKE ? OR s.lastName LIKE ? OR s.studentId LIKE ? OR c.name LIKE ? OR c.code LIKE ? OR c.department LIKE ? OR c.faculty LIKE ? OR et.name LIKE ?)",
      )
      params.push(like, like, like, like, like, like, like, like)
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const page = clampInt(filters.page || 1, 1, 100000)
    const limit = clampInt(filters.limit || 10, 1, 100)
    const offset = (page - 1) * limit

    const countRows = await dbQuery<RowDataPacket & { total: number }>(
      `SELECT COUNT(*) as total
       FROM academic_module_exam_results r
       LEFT JOIN academic_module_students s ON s.id = r.studentId
       LEFT JOIN academic_module_courses c ON c.id = r.courseId
       LEFT JOIN academic_module_exam_types et ON et.id = r.examTypeId
       ${whereSql}`,
      params,
    )
    const total = Number(countRows?.[0]?.total || 0)

    const rows = await dbQuery<DbExamResultRow>(
      `SELECT
        r.id, r.studentId, r.courseId, r.examTypeId, r.sessionId, r.semesterId,
        r.score, r.maxScore, r.percentage, r.gradePoint, r.letterGrade,
        r.comments, r.isPublished, r.enteredBy, r.enteredAt, r.modifiedBy, r.modifiedAt,
        r.createdAt, r.updatedAt,
        CONCAT(COALESCE(s.firstName, ''), ' ', COALESCE(s.lastName, '')) as studentName,
        s.studentId as studentNumber,
        s.gender as studentGender,
        c.name as courseName,
        c.type as courseType,
        c.code as courseCode,
        c.credits as courseCredits,
        c.faculty as courseFaculty,
        c.department as courseDepartment,
        et.name as examTypeName,
        et.code as examTypeCode
      FROM academic_module_exam_results r
      LEFT JOIN academic_module_students s ON s.id = r.studentId
      LEFT JOIN academic_module_courses c ON c.id = r.courseId
      LEFT JOIN academic_module_exam_types et ON et.id = r.examTypeId
      ${whereSql}
      ORDER BY r.enteredAt DESC
      LIMIT ${offset}, ${limit}`,
      params,
    )

    return NextResponse.json({
      success: true,
      data: (rows || []).map((r) => ({
        ...r,
        isPublished: Boolean(r.isPublished),
        studentName: r.studentName ? String(r.studentName).trim() : "",
        studentNumber: r.studentNumber ? String(r.studentNumber) : "",
        studentGender: r.studentGender ? String(r.studentGender) : "",
        courseName: r.courseName ? String(r.courseName) : "",
        courseType: r.courseType ? String(r.courseType) : "",
        courseCode: r.courseCode ? String(r.courseCode) : "",
        courseCredits: r.courseCredits === null || r.courseCredits === undefined ? null : Number(r.courseCredits),
        courseFaculty: r.courseFaculty ? String(r.courseFaculty) : "",
        courseDepartment: r.courseDepartment ? String(r.courseDepartment) : "",
        examTypeName: r.examTypeName ? String(r.examTypeName) : "",
        examTypeCode: r.examTypeCode ? normalizeExamTypeCodeForOutput(String(r.examTypeCode)) : "",
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / Math.max(1, limit))),
      },
    })
  } catch (error) {
    console.error("Error fetching exam results:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch exam results" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureExamResultsTable()
    await ensureExamTypesTable()
    await ensureCoursesTable()
    await ensureSessionsTable()
    await ensureSemestersTable()
    await ensureStudentsTable()

    const body = await request.json()
    const validatedData = examResultSchema.parse(body)

    // Calculate percentage and grade point (simplified logic)
    const percentage = (validatedData.score / validatedData.maxScore) * 100
    const gradePoint = calculateGradePoint(percentage)
    const letterGrade = calculateLetterGrade(percentage)

    // Validate references exist
    const studentRows = await dbQuery<RowDataPacket & { id: string }>(
      "SELECT id FROM academic_module_students WHERE id = ? LIMIT 1",
      [validatedData.studentId],
    )
    if (studentRows.length === 0) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 400 })
    }

    const courseRows = await dbQuery<RowDataPacket & { id: string }>(
      "SELECT id FROM academic_module_courses WHERE id = ? LIMIT 1",
      [validatedData.courseId],
    )
    if (courseRows.length === 0) {
      return NextResponse.json({ success: false, error: "Course not found" }, { status: 400 })
    }

    const examTypeRows = await dbQuery<RowDataPacket & { id: string }>(
      "SELECT id FROM academic_module_exam_types WHERE id = ? AND isActive = TRUE LIMIT 1",
      [validatedData.examTypeId],
    )
    if (examTypeRows.length === 0) {
      return NextResponse.json({ success: false, error: "Exam type not found" }, { status: 400 })
    }

    const sessionRows = await dbQuery<RowDataPacket & { id: string }>(
      "SELECT id FROM sessions WHERE id = ? LIMIT 1",
      [validatedData.sessionId],
    )
    if (sessionRows.length === 0) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 400 })
    }

    const semesterRows = await dbQuery<RowDataPacket & { id: string }>(
      "SELECT id FROM academic_module_semesters WHERE id = ? AND sessionId = ? LIMIT 1",
      [validatedData.semesterId, validatedData.sessionId],
    )
    if (semesterRows.length === 0) {
      return NextResponse.json({ success: false, error: "Semester not found for this session" }, { status: 400 })
    }

    const id = crypto.randomUUID()
    const enteredBy = request.headers.get("x-user-id") || "system"
    const enteredAt = new Date()

    await dbQuery(
      `INSERT INTO academic_module_exam_results (
        id, studentId, courseId, examTypeId, sessionId, semesterId,
        score, maxScore, percentage, gradePoint, letterGrade,
        comments, isPublished, enteredBy, enteredAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        NULLIF(?, ''), FALSE, ?, ?
      )`,
      [
        id,
        validatedData.studentId,
        validatedData.courseId,
        validatedData.examTypeId,
        validatedData.sessionId,
        validatedData.semesterId,
        validatedData.score,
        validatedData.maxScore,
        percentage,
        gradePoint,
        letterGrade,
        validatedData.comments || "",
        enteredBy,
        enteredAt,
      ],
    )

    const created = await dbQuery<DbExamResultRow>(
      `SELECT
        r.id, r.studentId, r.courseId, r.examTypeId, r.sessionId, r.semesterId,
        r.score, r.maxScore, r.percentage, r.gradePoint, r.letterGrade,
        r.comments, r.isPublished, r.enteredBy, r.enteredAt, r.modifiedBy, r.modifiedAt,
        r.createdAt, r.updatedAt,
        CONCAT(COALESCE(s.firstName, ''), ' ', COALESCE(s.lastName, '')) as studentName,
        s.studentId as studentNumber,
        s.gender as studentGender,
        c.name as courseName,
        c.type as courseType,
        c.code as courseCode,
        c.credits as courseCredits,
        c.faculty as courseFaculty,
        c.department as courseDepartment,
        et.name as examTypeName,
        et.code as examTypeCode
      FROM academic_module_exam_results r
      LEFT JOIN academic_module_students s ON s.id = r.studentId
      LEFT JOIN academic_module_courses c ON c.id = r.courseId
      LEFT JOIN academic_module_exam_types et ON et.id = r.examTypeId
      WHERE r.id = ?
      LIMIT 1`,
      [id],
    )

    return NextResponse.json({
      success: true,
      data: created[0]
        ? {
            ...created[0],
            isPublished: Boolean(created[0].isPublished),
            studentName: created[0].studentName ? String(created[0].studentName).trim() : "",
            studentNumber: created[0].studentNumber ? String(created[0].studentNumber) : "",
            studentGender: created[0].studentGender ? String(created[0].studentGender) : "",
            courseName: created[0].courseName ? String(created[0].courseName) : "",
            courseType: created[0].courseType ? String(created[0].courseType) : "",
            courseCode: created[0].courseCode ? String(created[0].courseCode) : "",
            courseCredits:
              created[0].courseCredits === null || created[0].courseCredits === undefined
                ? null
                : Number(created[0].courseCredits),
            courseFaculty: created[0].courseFaculty ? String(created[0].courseFaculty) : "",
            courseDepartment: created[0].courseDepartment ? String(created[0].courseDepartment) : "",
            examTypeName: created[0].examTypeName ? String(created[0].examTypeName) : "",
            examTypeCode: created[0].examTypeCode ? normalizeExamTypeCodeForOutput(String(created[0].examTypeCode)) : "",
          }
        : null,
      message: "Exam result created successfully",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Validation failed", details: error.errors }, { status: 400 })
    }

    console.error("Error creating exam result:", error)
    return NextResponse.json({ success: false, error: "Failed to create exam result" }, { status: 500 })
  }
}

// Helper functions
function calculateGradePoint(percentage: number): number {
  if (percentage >= 90) return 4.0
  if (percentage >= 80) return 3.0
  if (percentage >= 65) return 2.0
  if (percentage >= 50) return 1.0
  return 0.0
}

function calculateLetterGrade(percentage: number): string {
  if (percentage >= 90) return "A"
  if (percentage >= 80) return "B"
  if (percentage >= 65) return "C"
  if (percentage >= 50) return "D"
  return "F"
}

// Audit logging is handled by DB fields (enteredBy/modifiedBy).
