import { NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import crypto from "crypto"
import { z } from "zod"

import { dbQuery } from "@/lib/db"
import { ensureStudentsTable } from "@/app/api/students/_db"
import { ensureCoursesTable } from "@/app/api/courses/_db"

const rowSchema = z.object({
  // Accept either UUIDs or business identifiers.
  studentId: z.string().optional(),
  studentNumber: z.string().optional(),
  gender: z.string().optional(),

  courseId: z.string().optional(),
  courseCode: z.string().optional(),
  courseCredits: z.string().optional(),
  faculty: z.string().optional(),
  department: z.string().optional(),

  examTypeCode: z.string().min(1),
  sessionId: z.string().min(1),
  semesterId: z.string().min(1),
  score: z.coerce.number().min(0),
  maxScore: z.coerce.number().min(1),
  comments: z.string().optional(),
})

type ImportError = {
  row: number
  field: string
  message: string
  value: string
}

type ImportResult = {
  success: number
  failed: number
  errors: ImportError[]
}

// ensureCoursesTable is shared in /api/courses/_db

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
      INDEX idx_isPublished (isPublished),
      INDEX idx_enteredAt (enteredAt)
    ) ENGINE=InnoDB`,
    [],
  )
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

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const headers = lines[0]
    .split(",")
    .map((h) => normalizeHeaderKey(h.trim()))
  const rows: Array<Record<string, string>> = []

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",")
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? "").trim()
    })
    rows.push(row)
  }

  return rows
}

function firstNonEmpty(...values: Array<string | undefined | null>): string {
  for (const v of values) {
    const s = String(v ?? "").trim()
    if (s) return s
  }
  return ""
}

function normalizeHeaderKey(key: string): string {
  const k = String(key || "").trim()
  if (!k) return k
  // tolerate common variants
  if (k === "studentNo") return "studentNumber"
  if (k === "course_code") return "courseCode"
  if (k === "courseCredits") return "courseCredits"
  return k
}

export async function POST(request: Request) {
  try {
    await ensureExamResultsTable()
    await ensureExamTypesTable()
    await ensureCoursesTable()
    await ensureSessionsTable()
    await ensureSemestersTable()
    await ensureStudentsTable()

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "File is required" }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        { success: false, error: "Only CSV files are supported for now" },
        { status: 400 },
      )
    }

    const csvText = await file.text()
    const rawRows = parseCsv(csvText)

    if (rawRows.length === 0) {
      return NextResponse.json({ success: false, error: "No data rows found" }, { status: 400 })
    }

    const examTypeRows = await dbQuery<RowDataPacket & { id: string; code: string }>(
      "SELECT id, code FROM academic_module_exam_types WHERE isActive = TRUE",
      [],
    )
    const examTypeByCode = new Map<string, string>()
    for (const r of examTypeRows || []) {
      examTypeByCode.set(String((r as any).code).toUpperCase(), String((r as any).id))
    }

    const result: ImportResult = { success: 0, failed: 0, errors: [] }
    const enteredBy = request.headers.get("x-user-id") || "system"

    for (let idx = 0; idx < rawRows.length; idx++) {
      const csvRowNumber = idx + 2 // header is row 1
      const raw = rawRows[idx]

      try {
        const parsed = rowSchema.parse({
          studentId: raw.studentId,
          studentNumber: raw.studentNumber,
          gender: raw.gender,
          courseId: raw.courseId,
          courseCode: raw.courseCode,
          courseCredits: raw.courseCredits,
          faculty: raw.faculty,
          department: raw.department,
          examTypeCode: raw.examTypeCode,
          sessionId: raw.sessionId,
          semesterId: raw.semesterId,
          score: raw.score,
          maxScore: raw.maxScore,
          comments: raw.comments,
        })

        const resolvedStudentIdInput = firstNonEmpty(parsed.studentId, parsed.studentNumber)
        if (!resolvedStudentIdInput) {
          result.failed += 1
          result.errors.push({
            row: csvRowNumber,
            field: "studentId",
            message: "studentId or studentNumber is required",
            value: "",
          })
          continue
        }

        const resolvedCourseIdInput = firstNonEmpty(parsed.courseId, parsed.courseCode)
        if (!resolvedCourseIdInput) {
          result.failed += 1
          result.errors.push({
            row: csvRowNumber,
            field: "courseId",
            message: "courseId or courseCode is required",
            value: "",
          })
          continue
        }

        const resolveExamTypeId = (code: string): string | undefined => {
          const upper = String(code || "").trim().toUpperCase()
          if (upper === "MID" || upper === "MIDTERM") return examTypeByCode.get("MID") || examTypeByCode.get("MIDTERM")
          if (upper === "FINAL") return examTypeByCode.get("FINAL")
          if (upper === "ASSIGNMENT" || upper === "ASSIGN") return examTypeByCode.get("ASSIGNMENT") || examTypeByCode.get("ASSIGN")
          if (upper === "ATTENDANCE" || upper === "ATT") return examTypeByCode.get("ATTENDANCE") || examTypeByCode.get("ATT")
          return examTypeByCode.get(upper)
        }

        const examTypeId = resolveExamTypeId(parsed.examTypeCode)
        if (!examTypeId) {
          result.failed += 1
          result.errors.push({
            row: csvRowNumber,
            field: "examTypeCode",
            message: "Unknown examTypeCode",
            value: parsed.examTypeCode,
          })
          continue
        }

        // Resolve student UUID from either uuid (id) or business studentId (studentNumber)
        const studentLookupRows = parsed.studentId
          ? await dbQuery<RowDataPacket & { id: string; gender: string }>(
              "SELECT id, gender FROM academic_module_students WHERE id = ? LIMIT 1",
              [parsed.studentId],
            )
          : await dbQuery<RowDataPacket & { id: string; gender: string }>(
              "SELECT id, gender FROM academic_module_students WHERE studentId = ? LIMIT 1",
              [String(parsed.studentNumber || "")],
            )

        if (!studentLookupRows.length) {
          result.failed += 1
          result.errors.push({
            row: csvRowNumber,
            field: parsed.studentId ? "studentId" : "studentNumber",
            message: "Student not found",
            value: parsed.studentId ? String(parsed.studentId) : String(parsed.studentNumber || ""),
          })
          continue
        }

        const resolvedStudentId = String((studentLookupRows[0] as any).id)

        // Optional gender validation if provided
        if (parsed.gender) {
          const expected = String(parsed.gender).trim().toLowerCase()
          const actual = String((studentLookupRows[0] as any).gender || "").trim().toLowerCase()
          if (expected && actual && expected !== actual) {
            result.failed += 1
            result.errors.push({
              row: csvRowNumber,
              field: "gender",
              message: `Gender mismatch (student is '${actual}')`,
              value: String(parsed.gender),
            })
            continue
          }
        }

        // Resolve course UUID from either uuid (id) or course code
        const courseLookupRows = parsed.courseId
          ? await dbQuery<RowDataPacket & { id: string }>(
              "SELECT id FROM academic_module_courses WHERE id = ? LIMIT 1",
              [parsed.courseId],
            )
          : await dbQuery<RowDataPacket & { id: string }>(
              "SELECT id FROM academic_module_courses WHERE LOWER(code) = LOWER(?) LIMIT 1",
              [String(parsed.courseCode || "")],
            )

        if (!courseLookupRows.length) {
          result.failed += 1
          result.errors.push({
            row: csvRowNumber,
            field: parsed.courseId ? "courseId" : "courseCode",
            message: "Course not found",
            value: parsed.courseId ? String(parsed.courseId) : String(parsed.courseCode || ""),
          })
          continue
        }

        const resolvedCourseId = String((courseLookupRows[0] as any).id)

        const sessionExists = await dbQuery<RowDataPacket & { id: string }>(
          "SELECT id FROM sessions WHERE id = ? LIMIT 1",
          [parsed.sessionId],
        )
        if (!sessionExists.length) {
          result.failed += 1
          result.errors.push({ row: csvRowNumber, field: "sessionId", message: "Session not found", value: parsed.sessionId })
          continue
        }

        const semesterExists = await dbQuery<RowDataPacket & { id: string }>(
          "SELECT id FROM academic_module_semesters WHERE id = ? AND sessionId = ? LIMIT 1",
          [parsed.semesterId, parsed.sessionId],
        )
        if (!semesterExists.length) {
          result.failed += 1
          result.errors.push({
            row: csvRowNumber,
            field: "semesterId",
            message: "Semester not found for this session",
            value: parsed.semesterId,
          })
          continue
        }

        const percentage = (parsed.score / parsed.maxScore) * 100
        const gradePoint = calculateGradePoint(percentage)
        const letterGrade = calculateLetterGrade(percentage)

        const id = crypto.randomUUID()
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
            resolvedStudentId,
            resolvedCourseId,
            examTypeId,
            parsed.sessionId,
            parsed.semesterId,
            parsed.score,
            parsed.maxScore,
            percentage,
            gradePoint,
            letterGrade,
            parsed.comments || "",
            enteredBy,
            enteredAt,
          ],
        )

        result.success += 1
      } catch (err) {
        result.failed += 1

        if (err instanceof z.ZodError) {
          const first = err.errors[0]
          result.errors.push({
            row: csvRowNumber,
            field: String(first?.path?.[0] || "row"),
            message: first?.message || "Invalid row",
            value: "",
          })
        } else {
          result.errors.push({
            row: csvRowNumber,
            field: "row",
            message: err instanceof Error ? err.message : "Failed to import row",
            value: "",
          })
        }
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error bulk importing exam results:", error)
    return NextResponse.json({ success: 0, failed: 0, errors: [{ row: 0, field: "file", message: "Failed to import file", value: "" }] }, { status: 500 })
  }
}
