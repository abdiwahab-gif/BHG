import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"

import { dbQuery } from "@/lib/db"
import { ensureStudentsTable } from "@/app/api/students/_db"
import { ensureCoursesTable } from "@/app/api/courses/_db"

const querySchema = z.object({
  sessionId: z.string().min(1),
  semesterId: z.string().min(1),
  courseId: z.string().optional(),
  format: z.enum(["json", "csv"]).optional(),
})

function normalizeExamTypeCodeForOutput(code: string): string {
  const upper = String(code || "").trim().toUpperCase()
  if (upper === "ASSIGN") return "ASSIGNMENT"
  if (upper === "ATT") return "ATTENDANCE"
  if (upper === "MIDTERM") return "MID"
  return upper
}

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

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value)
  if (/[\n\r,\"]/g.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

type ExamTypeItem = { id: string; code: string; name: string }

type FlatRow = RowDataPacket & {
  studentDbId: string
  studentNumber: string
  firstName: string
  lastName: string
  gender: string
  className: string
  sectionName: string

  courseId: string
  courseName: string
  courseType: string
  courseCode: string | null
  courseCredits: number | null
  courseFaculty: string | null
  courseDepartment: string | null

  examTypeCode: string
  score: number
  maxScore: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { sessionId, semesterId, courseId, format } = querySchema.parse(Object.fromEntries(searchParams))

    // Ensure core tables exist
    await ensureStudentsTable()
    await ensureCoursesTable()

    // Ensure exam tables exist
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
        INDEX idx_session_semester (sessionId, semesterId)
      ) ENGINE=InnoDB`,
      [],
    )

    const examTypes = await dbQuery<RowDataPacket & ExamTypeItem>(
      "SELECT id, code, name FROM academic_module_exam_types WHERE isActive = TRUE ORDER BY createdAt ASC",
      [],
    )

    const examTypeCodes: string[] = []
    {
      const seen = new Set<string>()
      for (const t of examTypes || []) {
        const normalized = normalizeExamTypeCodeForOutput(String((t as any).code || ""))
        if (!normalized) continue
        if (seen.has(normalized)) continue
        seen.add(normalized)
        examTypeCodes.push(normalized)
      }
    }

    const where: string[] = ["r.sessionId = ?", "r.semesterId = ?"]
    const params: unknown[] = [sessionId, semesterId]
    if (courseId) {
      where.push("r.courseId = ?")
      params.push(courseId)
    }

    const rows = await dbQuery<FlatRow>(
      `SELECT
        s.id as studentDbId,
        s.studentId as studentNumber,
        s.firstName as firstName,
        s.lastName as lastName,
        s.gender as gender,
        s.className as className,
        s.sectionName as sectionName,

        c.id as courseId,
        c.name as courseName,
        c.type as courseType,
        c.code as courseCode,
        c.credits as courseCredits,
        c.faculty as courseFaculty,
        c.department as courseDepartment,

        et.code as examTypeCode,
        r.score as score,
        r.maxScore as maxScore
      FROM academic_module_exam_results r
      INNER JOIN academic_module_students s ON s.id = r.studentId
      INNER JOIN academic_module_courses c ON c.id = r.courseId
      INNER JOIN academic_module_exam_types et ON et.id = r.examTypeId
      WHERE ${where.join(" AND ")}
      ORDER BY c.name ASC, s.lastName ASC, s.firstName ASC`,
      params,
    )

    // Pivot: key = studentDbId + courseId
    type Pivot = {
      studentDbId: string
      studentNumber: string
      studentName: string
      gender: string
      className: string
      sectionName: string

      courseId: string
      courseName: string
      courseType: string
      courseCode: string
      courseCredits: number | null
      faculty: string
      department: string

      components: Record<string, { score: number; maxScore: number }>
      totalScore: number
      totalMaxScore: number
      percentage: number
      gradePoint: number
      letterGrade: string
    }

    const pivots = new Map<string, Pivot>()

    for (const r of rows || []) {
      const studentDbId = String((r as any).studentDbId)
      const courseIdVal = String((r as any).courseId)
      const key = `${studentDbId}:${courseIdVal}`

      if (!pivots.has(key)) {
        const studentName = `${String((r as any).firstName || "")} ${String((r as any).lastName || "")}`.trim()
        pivots.set(key, {
          studentDbId,
          studentNumber: String((r as any).studentNumber || ""),
          studentName,
          gender: String((r as any).gender || ""),
          className: String((r as any).className || ""),
          sectionName: String((r as any).sectionName || ""),

          courseId: courseIdVal,
          courseName: String((r as any).courseName || ""),
          courseType: String((r as any).courseType || ""),
          courseCode: String((r as any).courseCode || ""),
          courseCredits:
            (r as any).courseCredits === null || (r as any).courseCredits === undefined
              ? null
              : Number((r as any).courseCredits),
          faculty: String((r as any).courseFaculty || ""),
          department: String((r as any).courseDepartment || ""),

          components: {},
          totalScore: 0,
          totalMaxScore: 0,
          percentage: 0,
          gradePoint: 0,
          letterGrade: "",
        })
      }

      const pivot = pivots.get(key)!
      const examTypeCode = normalizeExamTypeCodeForOutput(String((r as any).examTypeCode || ""))
      const score = Number((r as any).score || 0)
      const maxScore = Number((r as any).maxScore || 0)

      if (!pivot.components[examTypeCode]) {
        pivot.components[examTypeCode] = { score: 0, maxScore: 0 }
      }
      pivot.components[examTypeCode].score += score
      pivot.components[examTypeCode].maxScore += maxScore

      pivot.totalScore += score
      pivot.totalMaxScore += maxScore
    }

    const data = [...pivots.values()].map((p) => {
      const percentage = p.totalMaxScore > 0 ? (p.totalScore / p.totalMaxScore) * 100 : 0
      const gradePoint = calculateGradePoint(percentage)
      const letterGrade = calculateLetterGrade(percentage)

      return {
        ...p,
        totalScore: Math.round(p.totalScore * 100) / 100,
        totalMaxScore: Math.round(p.totalMaxScore * 100) / 100,
        percentage: Math.round(percentage * 100) / 100,
        gradePoint,
        letterGrade,
      }
    })

    if ((format || "json") === "csv") {
      const headers = [
        "studentNumber",
        "studentName",
        "gender",
        "className",
        "sectionName",
        "faculty",
        "department",
        "courseCode",
        "courseName",
        "courseCredits",
        ...examTypeCodes.map((c) => `${c}_score`),
        "totalScore",
        "percentage",
        "letterGrade",
        "gradePoint",
      ]

      const lines: string[] = []
      lines.push(headers.join(","))

      for (const row of data) {
        const values: unknown[] = []
        values.push(row.studentNumber)
        values.push(row.studentName)
        values.push(row.gender)
        values.push(row.className)
        values.push(row.sectionName)
        values.push(row.faculty)
        values.push(row.department)
        values.push(row.courseCode)
        values.push(row.courseName)
        values.push(row.courseCredits ?? "")

        for (const code of examTypeCodes) {
          const comp = row.components[String(code).toUpperCase()]
          values.push(comp ? Math.round(comp.score * 100) / 100 : "")
        }

        values.push(row.totalScore)
        values.push(row.percentage)
        values.push(row.letterGrade)
        values.push(row.gradePoint)

        lines.push(values.map(csvEscape).join(","))
      }

      return new NextResponse(lines.join("\n"), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename=exam-results-${sessionId}-${semesterId}.csv`,
        },
      })
    }

    return NextResponse.json({ success: true, data, examTypeCodes })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid parameters", details: error.errors }, { status: 400 })
    }

    console.error("Error generating exam results report:", error)
    return NextResponse.json({ success: false, error: "Failed to generate report" }, { status: 500 })
  }
}
