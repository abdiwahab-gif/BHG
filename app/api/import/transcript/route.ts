import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"

import { dbQuery } from "@/lib/db"
import { ensureStudentsTable } from "@/app/api/students/_db"
import { ensureCoursesTable } from "@/app/api/courses/_db"
import { ensureFacultiesTable } from "@/app/api/faculties/_db"
import { AuditLogger } from "@/lib/audit-logger"
import { AuthService } from "@/lib/auth"

type ParsedContext = {
  studentNumber: string
  studentName: string
  faculty: string
  department: string
  program: string
}

type ParsedCourseRow = {
  academicYear: string
  semester: string
  code: string
  title: string
  credits: number | null
  attendance?: number | null
  assignment?: number | null
  midExam?: number | null
  finalExam?: number | null
  totalMarks?: number | null
  grade?: string
}

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\uFFFD/g, "")
    .replace(/[\u0000-\u001F]+/g, " ")
    .trim()
}

function parseCsvLine(line: string): string[] {
  // This transcript-like export does not quote fields; a simple split is sufficient.
  return line.split(",").map((c) => cleanText(c))
}

function parseKeyValueCell(cell: string): { key: string; value: string } | null {
  const idx = cell.indexOf(":")
  if (idx < 0) return null
  const key = cleanText(cell.slice(0, idx))
  const value = cleanText(cell.slice(idx + 1))
  if (!key) return null
  return { key: key.toLowerCase(), value }
}

function slugFacultyId(name: string): string {
  const base = cleanText(name)
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return base.slice(0, 50) || "FACULTY"
}

function parseAcademicYear(value: string): string {
  const v = cleanText(value)
  const m = v.match(/(\d{4})\s*[\/-]\s*(\d{4})/)
  if (!m) return v
  return `${m[1]}/${m[2]}`
}

function academicYearToDates(academicYear: string): { startDate: string; endDate: string } {
  const m = academicYear.match(/(\d{4})\s*[\/-]\s*(\d{4})/)
  if (!m) {
    const now = new Date()
    const y = now.getFullYear()
    return { startDate: `${y}-09-01`, endDate: `${y + 1}-06-30` }
  }
  const startYear = Number(m[1])
  const endYear = Number(m[2])
  return { startDate: `${startYear}-09-01`, endDate: `${endYear}-06-30` }
}

function semesterToDates(academicYear: string, semester: string): { startDate: string; endDate: string } {
  const { startDate, endDate } = academicYearToDates(academicYear)
  const startYear = Number(startDate.slice(0, 4))
  const endYear = Number(endDate.slice(0, 4))
  const sem = cleanText(semester).toLowerCase()

  if (sem.startsWith("fall")) {
    return { startDate: `${startYear}-09-01`, endDate: `${startYear}-12-31` }
  }
  if (sem.startsWith("spring")) {
    return { startDate: `${endYear}-01-01`, endDate: `${endYear}-06-30` }
  }

  // Fallback: use the academic year span.
  return { startDate, endDate }
}

function parseNumber(value: string): number | null {
  const v = cleanText(value)
  if (!v) return null
  const n = Number.parseFloat(v)
  return Number.isFinite(n) ? n : null
}

function normalizeGrade(value: string): string {
  const g = cleanText(value).toUpperCase()
  if (!g) return ""
  return g.replace(/\s+/g, "")
}

function gradePointFromLetter(letter: string): number {
  const g = normalizeGrade(letter)
  if (g === "A+" || g === "A") return 4.0
  if (g === "A-") return 3.7
  if (g === "B+") return 3.3
  if (g === "B") return 3.0
  if (g === "B-") return 2.7
  if (g === "C+") return 2.3
  if (g === "C") return 2.0
  if (g === "C-") return 1.7
  if (g === "D+") return 1.3
  if (g === "D") return 1.0
  return 0.0
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
  // Enforce unique name case-insensitive at the app level.
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
      INDEX idx_session_semester (sessionId, semesterId)
    ) ENGINE=InnoDB`,
    [],
  )
}

async function getOrCreateSessionId(name: string): Promise<string> {
  const sessionName = cleanText(name)
  if (!sessionName) return ""

  const existing = await dbQuery<RowDataPacket & { id: string }>(
    "SELECT id FROM sessions WHERE LOWER(name) = LOWER(?) LIMIT 1",
    [sessionName],
  )
  if (existing?.[0]?.id) return String(existing[0].id)

  const { startDate, endDate } = academicYearToDates(sessionName)
  await dbQuery(
    "INSERT INTO sessions (id, name, startDate, endDate, isActive) VALUES (UUID(), ?, ?, ?, FALSE)",
    [sessionName, startDate, endDate],
  )

  const created = await dbQuery<RowDataPacket & { id: string }>(
    "SELECT id FROM sessions WHERE LOWER(name) = LOWER(?) ORDER BY createdAt DESC LIMIT 1",
    [sessionName],
  )
  return created?.[0]?.id ? String(created[0].id) : ""
}

async function getOrCreateSemesterId(sessionId: string, academicYear: string, name: string): Promise<string> {
  const semName = cleanText(name)
  if (!sessionId || !semName) return ""

  const existing = await dbQuery<RowDataPacket & { id: string }>(
    "SELECT id FROM academic_module_semesters WHERE sessionId = ? AND LOWER(name) = LOWER(?) LIMIT 1",
    [sessionId, semName],
  )
  if (existing?.[0]?.id) return String(existing[0].id)

  const { startDate, endDate } = semesterToDates(academicYear, semName)
  await dbQuery(
    "INSERT INTO academic_module_semesters (id, sessionId, name, startDate, endDate) VALUES (UUID(), ?, ?, ?, ?)",
    [sessionId, semName, startDate, endDate],
  )

  const created = await dbQuery<RowDataPacket & { id: string }>(
    "SELECT id FROM academic_module_semesters WHERE sessionId = ? AND LOWER(name) = LOWER(?) ORDER BY createdAt DESC LIMIT 1",
    [sessionId, semName],
  )
  return created?.[0]?.id ? String(created[0].id) : ""
}

async function getOrCreateExamTypeId(code: string): Promise<string> {
  const upper = cleanText(code).toUpperCase()
  if (!upper) return ""

  const existing = await dbQuery<RowDataPacket & { id: string }>(
    "SELECT id FROM academic_module_exam_types WHERE UPPER(code) = UPPER(?) LIMIT 1",
    [upper],
  )
  if (existing?.[0]?.id) return String(existing[0].id)

  const name = upper === "TRANSCRIPT" ? "Transcript Total" : upper
  await dbQuery(
    "INSERT INTO academic_module_exam_types (id, name, code, weight, description, isActive) VALUES (UUID(), ?, ?, 100, 'Imported transcript totals', TRUE)",
    [name, upper],
  )

  const created = await dbQuery<RowDataPacket & { id: string }>(
    "SELECT id FROM academic_module_exam_types WHERE UPPER(code) = UPPER(?) ORDER BY createdAt DESC LIMIT 1",
    [upper],
  )
  return created?.[0]?.id ? String(created[0].id) : ""
}

async function getOrCreateCourseId(input: {
  code: string
  title: string
  credits: number | null
  faculty: string
  department: string
}): Promise<string> {
  const code = cleanText(input.code)
  const title = cleanText(input.title)
  if (!title) return ""

  if (code && code.toLowerCase() !== "coursecode") {
    const rows = await dbQuery<RowDataPacket & { id: string }>(
      "SELECT id FROM academic_module_courses WHERE UPPER(code) = UPPER(?) LIMIT 1",
      [code],
    )
    if (rows?.[0]?.id) return String(rows[0].id)
  }

  const byName = await dbQuery<RowDataPacket & { id: string }>(
    "SELECT id FROM academic_module_courses WHERE LOWER(name) = LOWER(?) LIMIT 1",
    [title],
  )
  if (byName?.[0]?.id) return String(byName[0].id)

  await dbQuery(
    "INSERT INTO academic_module_courses (id, name, type, code, credits, faculty, department) VALUES (UUID(), ?, 'TRANSCRIPT', NULLIF(?, ''), ?, NULLIF(?, ''), NULLIF(?, ''))",
    [title, code && code.toLowerCase() !== "coursecode" ? code : "", input.credits, input.faculty, input.department],
  )

  const created = await dbQuery<RowDataPacket & { id: string }>(
    "SELECT id FROM academic_module_courses WHERE LOWER(name) = LOWER(?) ORDER BY createdAt DESC LIMIT 1",
    [title],
  )
  return created?.[0]?.id ? String(created[0].id) : ""
}

async function ensureFacultyRecord(facultyName: string, department: string): Promise<void> {
  const name = cleanText(facultyName)
  if (!name) return

  const facultyId = slugFacultyId(name)
  const existing = await dbQuery<RowDataPacket & { id: string }>(
    "SELECT id FROM academic_module_faculties WHERE LOWER(facultyId) = LOWER(?) LIMIT 1",
    [facultyId],
  )
  if (existing.length > 0) return

  await dbQuery(
    "INSERT INTO academic_module_faculties (id, facultyId, name, department) VALUES (UUID(), ?, ?, NULLIF(?, ''))",
    [facultyId, name, department],
  )
}

async function getOrCreateStudentId(ctx: ParsedContext): Promise<string> {
  const studentNumber = cleanText(ctx.studentNumber)
  if (!studentNumber) return ""

  const existing = await dbQuery<RowDataPacket & { id: string }>(
    "SELECT id FROM academic_module_students WHERE studentId = ? LIMIT 1",
    [studentNumber],
  )
  if (existing?.[0]?.id) {
    // Best-effort update of imported metadata.
    await dbQuery(
      "UPDATE academic_module_students SET program = NULLIF(?, ''), faculty = NULLIF(?, ''), department = NULLIF(?, '') WHERE id = ?",
      [ctx.program, ctx.faculty, ctx.department, String(existing[0].id)],
    ).catch(() => undefined)

    return String(existing[0].id)
  }

  const fullName = cleanText(ctx.studentName)
  const parts = fullName.split(/\s+/).filter(Boolean)
  const firstName = parts[0] || `Student ${studentNumber}`
  const lastName = parts.slice(1).join(" ") || "Imported"

  const email = `s${studentNumber}@import.local`

  await dbQuery(
    `INSERT INTO academic_module_students (
      id,
      firstName, lastName, email, passwordHash, birthday,
      phone, className, sectionName, gender,
      bloodType, nationality, religion,
      address, address2, city, zip,
      idCardNumber, boardRegistrationNo,
      fatherName, motherName, fatherPhone, motherPhone,
      fatherOccupation, motherOccupation, fatherEmail, motherEmail,
      emergencyContact, medicalConditions, allergies, previousSchool, transferReason,
      studentId, status, enrollmentDate, photo,
      program, faculty, department
    ) VALUES (
      UUID(),
      ?, ?, ?, NULL, NULL,
      '-', ?, 'Imported', 'other',
      'N/A', 'N/A', 'N/A',
      'N/A', NULL, 'N/A', 'N/A',
      NULL, NULL,
      'N/A', 'N/A', '-', '-',
      NULL, NULL, NULL, NULL,
      '-', NULL, NULL, NULL, NULL,
      ?, 'active', CURRENT_DATE(), NULL,
      NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, '')
    )`,
    [firstName, lastName, email, ctx.program || "Imported", studentNumber, ctx.program, ctx.faculty, ctx.department],
  )

  const created = await dbQuery<RowDataPacket & { id: string }>(
    "SELECT id FROM academic_module_students WHERE studentId = ? ORDER BY createdAt DESC LIMIT 1",
    [studentNumber],
  )
  return created?.[0]?.id ? String(created[0].id) : ""
}

function parseTranscript(text: string): { context: ParsedContext; rows: ParsedCourseRow[]; warnings: string[] } {
  const warnings: string[] = []
  const lines = text.split(/\r?\n/)

  const ctx: ParsedContext = {
    studentNumber: "",
    studentName: "",
    faculty: "",
    department: "",
    program: "",
  }

  let currentSemester = ""
  let currentAcademicYear = ""

  const rows: ParsedCourseRow[] = []

  for (const rawLine of lines) {
    const line = cleanText(rawLine)
    if (!line) continue

    const cells = parseCsvLine(line)
    const first = cleanText(cells[0] || "")
    const second = cleanText(cells[1] || "")

    // Student metadata lines.
    const kv = parseKeyValueCell(first)
    if (kv?.key === "id number") {
      ctx.studentNumber = cleanText(kv.value)
      continue
    }
    if (kv?.key === "student name") {
      ctx.studentName = cleanText(kv.value)
      continue
    }
    if (kv?.key === "faculty") {
      ctx.faculty = cleanText(kv.value)
      continue
    }
    if (kv?.key === "department") {
      ctx.department = cleanText(kv.value)
      if (!ctx.program) ctx.program = ctx.department
      continue
    }

    // Semester marker.
    if (/^semester\s*:/i.test(first)) {
      const v = cleanText(first.split(":").slice(1).join(":")).split(",")[0]
      currentSemester = cleanText(v)
      continue
    }

    // Academic year marker (sometimes appears alongside a course row).
    if (/^academic\s*year/i.test(first)) {
      const yr = parseAcademicYear(first)
      currentAcademicYear = yr

      // If this line also contains a plausible course title/credits, treat as first row.
      const title = second
      const credits = parseNumber(cells[2] || "")
      const totalMarks = parseNumber(cells[7] || "")
      const grade = normalizeGrade(cells[8] || "")

      if (title && !/course\s*title/i.test(title) && !/semester\s*gpa/i.test(title)) {
        rows.push({
          academicYear: currentAcademicYear,
          semester: currentSemester,
          code: "",
          title,
          credits,
          attendance: parseNumber(cells[3] || ""),
          assignment: parseNumber(cells[4] || ""),
          midExam: parseNumber(cells[5] || ""),
          finalExam: parseNumber(cells[6] || ""),
          totalMarks,
          grade,
        })
      }

      continue
    }

    // Header rows.
    if (/^coursecode$/i.test(first) && /course\s*title/i.test(second)) continue

    if (!currentSemester || !currentAcademicYear) continue

    // Course row candidates.
    const codeCell = first
    const titleCell = second

    if (!titleCell) continue
    if (/semester\s*gpa/i.test(titleCell)) continue

    const credits = parseNumber(cells[2] || "")
    const totalMarks = parseNumber(cells[7] || "")
    const grade = normalizeGrade(cells[8] || "")

    const code = cleanText(codeCell)
    const looksLikeCode = /[A-Z]{2,4}\s*\d{2,4}[A-Z]?/i.test(code)

    // Some lines misuse 'CourseCode' as a value; treat as missing.
    const normalizedCode = looksLikeCode ? code : code.toLowerCase() === "coursecode" ? "" : code

    // Skip rows that have no usable marks.
    if (totalMarks === null && !grade) {
      continue
    }

    rows.push({
      academicYear: currentAcademicYear,
      semester: currentSemester,
      code: normalizedCode,
      title: titleCell,
      credits,
      attendance: parseNumber(cells[3] || ""),
      assignment: parseNumber(cells[4] || ""),
      midExam: parseNumber(cells[5] || ""),
      finalExam: parseNumber(cells[6] || ""),
      totalMarks,
      grade,
    })
  }

  if (!ctx.studentNumber) warnings.push("Student number was not detected")
  if (!ctx.studentName) warnings.push("Student name was not detected")
  if (!ctx.faculty) warnings.push("Faculty was not detected")
  if (!ctx.department) warnings.push("Department/program was not detected")

  return { context: ctx, rows, warnings }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")
    const userName = request.headers.get("x-user-name")

    if (!userId) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
    }

    const user = { id: userId, role: (userRole as any) || "student", name: userName || "", isActive: true }

    if (!AuthService.hasPermission(user, "students", "create") || !AuthService.hasPermission(user, "exam_results", "create")) {
      return NextResponse.json({ success: false, message: "Insufficient permissions" }, { status: 403 })
    }

    await ensureStudentsTable()
    await ensureCoursesTable()
    await ensureFacultiesTable()
    await ensureSessionsTable()
    await ensureSemestersTable()
    await ensureExamTypesTable()
    await ensureExamResultsTable()

    const form = await request.formData()
    const file = form.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: "file is required" }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ success: false, message: "Only .csv files are supported" }, { status: 400 })
    }

    const text = await file.text()
    const parsed = parseTranscript(text)

    const studentUuid = await getOrCreateStudentId(parsed.context)
    if (!studentUuid) {
      return NextResponse.json({ success: false, message: "Failed to create or resolve student" }, { status: 500 })
    }

    await ensureFacultyRecord(parsed.context.faculty, parsed.context.department)

    const examTypeId = await getOrCreateExamTypeId("TRANSCRIPT")
    if (!examTypeId) {
      return NextResponse.json({ success: false, message: "Failed to resolve exam type" }, { status: 500 })
    }

    let createdCourses = 0
    let createdResults = 0
    let skippedResults = 0

    for (const row of parsed.rows) {
      const sessionName = parseAcademicYear(row.academicYear)
      const sessionId = await getOrCreateSessionId(sessionName)
      const semesterId = await getOrCreateSemesterId(sessionId, sessionName, row.semester)
      if (!sessionId || !semesterId) continue

      const courseIdBefore = await dbQuery<RowDataPacket & { id: string }>(
        row.code ? "SELECT id FROM academic_module_courses WHERE UPPER(code) = UPPER(?) LIMIT 1" : "SELECT id FROM academic_module_courses WHERE LOWER(name) = LOWER(?) LIMIT 1",
        row.code ? [row.code] : [row.title],
      )
      const courseExisted = Boolean(courseIdBefore?.[0]?.id)

      const courseId = await getOrCreateCourseId({
        code: row.code,
        title: row.title,
        credits: row.credits,
        faculty: parsed.context.faculty,
        department: parsed.context.department,
      })
      if (!courseId) continue
      if (!courseExisted) createdCourses += 1

      const existingResult = await dbQuery<RowDataPacket & { id: string }>(
        "SELECT id FROM academic_module_exam_results WHERE studentId = ? AND courseId = ? AND examTypeId = ? AND sessionId = ? AND semesterId = ? LIMIT 1",
        [studentUuid, courseId, examTypeId, sessionId, semesterId],
      )
      if (existingResult.length > 0) {
        skippedResults += 1
        continue
      }

      const score = row.totalMarks ?? 0
      const maxScore = 100
      const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
      const letter = normalizeGrade(row.grade || "") || ""
      const gradePoint = letter ? gradePointFromLetter(letter) : 0

      const comments = {
        source: "transcript_import",
        attendance: row.attendance,
        assignment: row.assignment,
        midExam: row.midExam,
        finalExam: row.finalExam,
        totalMarks: row.totalMarks,
        grade: row.grade,
        credits: row.credits,
      }

      await dbQuery(
        `INSERT INTO academic_module_exam_results (
          id, studentId, courseId, examTypeId, sessionId, semesterId,
          score, maxScore, percentage, gradePoint, letterGrade, comments,
          isPublished, enteredBy, enteredAt
        ) VALUES (
          UUID(), ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          FALSE, ?, NOW()
        )`,
        [
          studentUuid,
          courseId,
          examTypeId,
          sessionId,
          semesterId,
          score,
          maxScore,
          percentage,
          gradePoint,
          letter || (percentage >= 50 ? "P" : "F"),
          JSON.stringify(comments),
          userId,
        ],
      )

      createdResults += 1
    }

    try {
      await AuditLogger.log({
        userId,
        userRole: String(userRole || ""),
        userName: String(userName || ""),
        action: "CREATE",
        entityType: "TRANSCRIPT",
        entityId: parsed.context.studentNumber || studentUuid,
        oldValues: undefined,
        newValues: {
          studentId: studentUuid,
          studentNumber: parsed.context.studentNumber,
          rows: parsed.rows.length,
          createdCourses,
          createdResults,
          skippedResults,
          faculty: parsed.context.faculty,
          department: parsed.context.department,
          program: parsed.context.program,
        },
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        additionalData: { warnings: parsed.warnings },
      })
    } catch (e) {
      console.error("Failed to audit transcript import", e)
    }

    return NextResponse.json({
      success: true,
      message: "Transcript imported",
      data: {
        studentId: studentUuid,
        studentNumber: parsed.context.studentNumber,
        studentName: parsed.context.studentName,
        faculty: parsed.context.faculty,
        department: parsed.context.department,
        program: parsed.context.program,
        parsedRows: parsed.rows.length,
        createdCourses,
        createdResults,
        skippedResults,
        warnings: parsed.warnings,
      },
    })
  } catch (error) {
    console.error("[POST /api/import/transcript]", error)
    const message = error instanceof Error ? error.message : "Failed to import transcript"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
