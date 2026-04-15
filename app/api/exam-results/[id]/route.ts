import { type NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { dbQuery } from "@/lib/db"
import { ensureStudentsTable } from "@/app/api/students/_db"
import { ensureCoursesTable } from "@/app/api/courses/_db"

const updateSchema = z.object({
  score: z.number().min(0).optional(),
  maxScore: z.number().min(1).optional(),
  comments: z.string().optional(),
  isPublished: z.boolean().optional(),
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
// ensureCoursesTable is shared in /api/courses/_db

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

async function getResultById(id: string): Promise<DbExamResultRow | null> {
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
    WHERE r.id = ?
    LIMIT 1`,
    [id],
  )
  return rows[0] || null
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureExamResultsTable()
    await ensureExamTypesTable()
    await ensureCoursesTable()
    await ensureStudentsTable()

    const result = await getResultById(params.id)

    if (!result) {
      return NextResponse.json({ success: false, error: "Exam result not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        isPublished: Boolean(result.isPublished),
        studentName: result.studentName ? String(result.studentName).trim() : "",
        studentNumber: result.studentNumber ? String(result.studentNumber) : "",
        studentGender: result.studentGender ? String(result.studentGender) : "",
        courseName: result.courseName ? String(result.courseName) : "",
        courseType: result.courseType ? String(result.courseType) : "",
        courseCode: result.courseCode ? String(result.courseCode) : "",
        courseCredits: result.courseCredits === null || result.courseCredits === undefined ? null : Number(result.courseCredits),
        courseFaculty: result.courseFaculty ? String(result.courseFaculty) : "",
        courseDepartment: result.courseDepartment ? String(result.courseDepartment) : "",
        examTypeName: result.examTypeName ? String(result.examTypeName) : "",
        examTypeCode: result.examTypeCode ? normalizeExamTypeCodeForOutput(String(result.examTypeCode)) : "",
      },
    })
  } catch (error) {
    console.error("Error fetching exam result:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch exam result" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureExamResultsTable()
    await ensureExamTypesTable()
    await ensureCoursesTable()
    await ensureStudentsTable()

    const body = await request.json()
    const validatedData = updateSchema.parse(body)

    const existing = await getResultById(params.id)
    if (!existing) {
      return NextResponse.json({ success: false, error: "Exam result not found" }, { status: 404 })
    }

    const score = validatedData.score ?? Number(existing.score)
    const maxScore = validatedData.maxScore ?? Number(existing.maxScore)
    const shouldRecalc = validatedData.score !== undefined || validatedData.maxScore !== undefined
    const percentage = shouldRecalc ? (score / maxScore) * 100 : Number(existing.percentage)
    const gradePoint = shouldRecalc ? calculateGradePoint(percentage) : Number(existing.gradePoint)
    const letterGrade = shouldRecalc ? calculateLetterGrade(percentage) : String(existing.letterGrade)

    const modifiedBy = request.headers.get("x-user-id") || "system"
    const modifiedAt = new Date()

    await dbQuery(
      `UPDATE academic_module_exam_results
       SET
         score = COALESCE(?, score),
         maxScore = COALESCE(?, maxScore),
         percentage = ?,
         gradePoint = ?,
         letterGrade = ?,
         comments = CASE WHEN ? IS NULL THEN comments ELSE NULLIF(?, '') END,
         isPublished = COALESCE(?, isPublished),
         modifiedBy = ?,
         modifiedAt = ?
       WHERE id = ?`,
      [
        validatedData.score ?? null,
        validatedData.maxScore ?? null,
        percentage,
        gradePoint,
        letterGrade,
        validatedData.comments === undefined ? null : validatedData.comments,
        validatedData.comments || "",
        validatedData.isPublished === undefined ? null : validatedData.isPublished,
        modifiedBy,
        modifiedAt,
        params.id,
      ],
    )

    const updated = await getResultById(params.id)

    return NextResponse.json({
      success: true,
      data: updated
        ? {
            ...updated,
            isPublished: Boolean(updated.isPublished),
            studentName: updated.studentName ? String(updated.studentName).trim() : "",
            studentNumber: updated.studentNumber ? String(updated.studentNumber) : "",
            courseName: updated.courseName ? String(updated.courseName) : "",
            courseType: updated.courseType ? String(updated.courseType) : "",
            examTypeName: updated.examTypeName ? String(updated.examTypeName) : "",
            examTypeCode: updated.examTypeCode ? normalizeExamTypeCodeForOutput(String(updated.examTypeCode)) : "",
          }
        : null,
      message: "Exam result updated successfully",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Validation failed", details: error.errors }, { status: 400 })
    }

    console.error("Error updating exam result:", error)
    return NextResponse.json({ success: false, error: "Failed to update exam result" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureExamResultsTable()

    const rows = await dbQuery<RowDataPacket & { id: string }>(
      "SELECT id FROM academic_module_exam_results WHERE id = ? LIMIT 1",
      [params.id],
    )
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Exam result not found" }, { status: 404 })
    }

    await dbQuery("DELETE FROM academic_module_exam_results WHERE id = ?", [params.id])

    return NextResponse.json({
      success: true,
      message: "Exam result deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting exam result:", error)
    return NextResponse.json({ success: false, error: "Failed to delete exam result" }, { status: 500 })
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

// Audit logging is handled by DB fields (modifiedBy/modifiedAt).
