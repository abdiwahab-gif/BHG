import type { RowDataPacket } from "mysql2/promise"
import { dbQuery } from "@/lib/db"

import type { TranscriptCourse, TranscriptData, TranscriptTerm, TranscriptTermName } from "@/types/transcript"

type DbStudentLookup = RowDataPacket & {
  id: string
  studentId: string
  firstName: string
  lastName: string
  enrollmentDate: string | Date | null
  createdAt: string | Date | null
}

type DbTranscriptResultRow = RowDataPacket & {
  sessionId: string
  sessionName: string
  sessionStartDate: string | Date | null
  semesterId: string
  semesterName: string
  courseId: string
  courseCode: string | null
  courseName: string | null
  credits: number | string | null
  letterGrade: string
  gradePoint: number | string
  enteredAt: string | Date
  examTypeCode: string | null
  faculty: string | null
  department: string | null
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function toIsoDate(value: unknown): string {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toISOString().slice(0, 10)
}

function toAcademicYearLabel(name: string): string {
  const normalized = String(name || "").trim()
  if (!normalized) return ""
  // Prefer an en dash between years (matches transcript layout)
  if (normalized.includes("/")) return normalized.replaceAll("/", "–")
  if (normalized.includes("-")) return normalized.replaceAll("-", "–")
  return normalized
}

function academicYearSortKey(label: string): number {
  const m = String(label).match(/(\d{4})\D+(\d{4})/)
  if (!m) return Number.POSITIVE_INFINITY
  return Number(m[1]) * 10000 + Number(m[2])
}

function normalizeTermName(name: string): TranscriptTermName {
  const n = String(name || "").trim().toLowerCase()
  if (n.includes("spring")) return "Spring Semester"
  if (n.includes("fall")) return "Fall Semester"
  if (n.includes("first") || n === "1" || n.includes("1st")) return "Spring Semester"
  if (n.includes("second") || n === "2" || n.includes("2nd")) return "Fall Semester"
  // Default to Spring to keep output stable (the UI only supports Spring/Fall).
  return "Spring Semester"
}

function termOrder(term: TranscriptTermName): number {
  return term === "Spring Semester" ? 0 : 1
}

function round2(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0
}

export async function buildTranscriptData(studentIdOrNumber: string): Promise<TranscriptData> {
  return buildTranscriptDataWithOptions(studentIdOrNumber, {})
}

export async function buildTranscriptDataWithOptions(
  studentIdOrNumber: string,
  options: { publishedOnly?: boolean; subtitle?: string } = {},
): Promise<TranscriptData> {
  const input = String(studentIdOrNumber || "").trim()
  if (!input) {
    throw new Error("studentId is required")
  }

  const studentRows = await dbQuery<DbStudentLookup>(
    isUuid(input)
      ? "SELECT id, studentId, firstName, lastName, enrollmentDate, createdAt FROM academic_module_students WHERE id = ? LIMIT 1"
      : "SELECT id, studentId, firstName, lastName, enrollmentDate, createdAt FROM academic_module_students WHERE studentId = ? LIMIT 1",
    [input],
  )

  const student = studentRows[0]
  if (!student) {
    throw new Error("Student not found")
  }

  // Pull all OVERALL course results for the student (fallback to any result if exam type codes are missing).
  const rows = await dbQuery<DbTranscriptResultRow>(
    `SELECT
      r.sessionId,
      COALESCE(sess.name, '') as sessionName,
      sess.startDate as sessionStartDate,
      r.semesterId,
      COALESCE(sem.name, '') as semesterName,
      r.courseId,
      c.code as courseCode,
      c.name as courseName,
      c.credits as credits,
      c.faculty as faculty,
      c.department as department,
      r.letterGrade,
      r.gradePoint,
      r.enteredAt,
      et.code as examTypeCode
    FROM academic_module_exam_results r
    LEFT JOIN academic_module_courses c ON c.id = r.courseId
    LEFT JOIN sessions sess ON sess.id = r.sessionId
    LEFT JOIN academic_module_semesters sem ON sem.id = r.semesterId
    LEFT JOIN academic_module_exam_types et ON et.id = r.examTypeId
    WHERE r.studentId = ?
      ${options.publishedOnly ? "AND r.isPublished = TRUE" : ""}
    ORDER BY r.enteredAt DESC`,
    [student.id],
  )

  type TermAgg = {
    academicYear: string
    term: TranscriptTermName
    sessionId: string
    semesterId: string
    coursesById: Map<string, DbTranscriptResultRow>
  }

  const terms = new Map<string, TermAgg>()

  for (const row of rows) {
    const academicYear = toAcademicYearLabel(row.sessionName)
    const term = normalizeTermName(row.semesterName)
    const key = `${String(row.sessionId)}::${String(row.semesterId)}`

    const existing = terms.get(key) || {
      academicYear,
      term,
      sessionId: String(row.sessionId),
      semesterId: String(row.semesterId),
      coursesById: new Map<string, DbTranscriptResultRow>(),
    }

    // De-dupe per course: prefer OVERALL, otherwise keep the most recent (rows are ordered by enteredAt DESC).
    const current = existing.coursesById.get(String(row.courseId))
    const incomingIsOverall = String(row.examTypeCode || "").toUpperCase() === "OVERALL"
    const currentIsOverall = current ? String(current.examTypeCode || "").toUpperCase() === "OVERALL" : false

    if (!current || (incomingIsOverall && !currentIsOverall)) {
      existing.coursesById.set(String(row.courseId), row)
    }

    terms.set(key, existing)
  }

  const termRows: TranscriptTerm[] = Array.from(terms.values())
    .sort((a, b) => {
      const aYear = academicYearSortKey(a.academicYear)
      const bYear = academicYearSortKey(b.academicYear)
      if (aYear !== bYear) return aYear - bYear
      const aTerm = termOrder(a.term)
      const bTerm = termOrder(b.term)
      if (aTerm !== bTerm) return aTerm - bTerm
      return 0
    })
    .map((t) => {
      const courses: TranscriptCourse[] = Array.from(t.coursesById.values())
        .map((r) => {
          const creditsNum = r.credits === null || r.credits === undefined ? 0 : Number(r.credits)
          const gradePointNum = r.gradePoint === null || r.gradePoint === undefined ? 0 : Number(r.gradePoint)
          const creditHours = Number.isFinite(creditsNum) ? creditsNum : 0
          const honorPoints = round2(creditHours * (Number.isFinite(gradePointNum) ? gradePointNum : 0))

          return {
            code: String(r.courseCode || String(r.courseId).slice(0, 8)),
            title: String(r.courseName || ""),
            creditHours: Number.isFinite(creditHours) ? creditHours : 0,
            grade: String(r.letterGrade || ""),
            honorPoints,
          }
        })
        .sort((a, b) => String(a.code).localeCompare(String(b.code)))

      const creditHoursCurrent = courses.reduce((sum, c) => sum + (Number.isFinite(c.creditHours) ? c.creditHours : 0), 0)
      const totalGradePoints = courses.reduce((sum, c) => sum + c.honorPoints, 0)
      const gpaCurrent = creditHoursCurrent > 0 ? round2(totalGradePoints / creditHoursCurrent) : 0

      return {
        academicYear: t.academicYear,
        term: t.term,
        creditHoursCurrent,
        creditHoursCumulative: 0,
        gpaCurrent,
        gpaCumulative: 0,
        courses,
      }
    })

  // Compute cumulative credits/GPA across terms in chronological order.
  let cumulativeCredits = 0
  let cumulativeGradePoints = 0
  for (const term of termRows) {
    cumulativeCredits += term.creditHoursCurrent
    const termGradePoints = term.courses.reduce((sum, c) => sum + c.honorPoints, 0)
    cumulativeGradePoints += termGradePoints

    term.creditHoursCumulative = cumulativeCredits
    term.gpaCumulative = cumulativeCredits > 0 ? round2(cumulativeGradePoints / cumulativeCredits) : 0
  }

  // Infer faculty/department from the most frequent values across the student's courses.
  const facultyCounts = new Map<string, number>()
  const deptCounts = new Map<string, number>()
  for (const r of rows) {
    const f = String(r.faculty || "").trim()
    const d = String(r.department || "").trim()
    if (f) facultyCounts.set(f, (facultyCounts.get(f) || 0) + 1)
    if (d) deptCounts.set(d, (deptCounts.get(d) || 0) + 1)
  }

  const faculty = Array.from(facultyCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || ""
  const department = Array.from(deptCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || ""

  const studentName = `${String(student.firstName || "").trim()} ${String(student.lastName || "").trim()}`.trim()
  const cgpa = termRows.length > 0 ? termRows[termRows.length - 1].gpaCumulative : 0

  const today = new Date()
  const dateOfIssue = today.toISOString().slice(0, 10)

  // Initial entry date: derive from earliest academic-year session for which the student has results.
  const earliestSessionStart = rows
    .map((r) => r.sessionStartDate)
    .filter(Boolean)
    .map((d) => (d instanceof Date ? d : new Date(String(d))))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())[0]

  const dateOfInitialEntry = earliestSessionStart
    ? earliestSessionStart.toISOString().slice(0, 10)
    : toIsoDate(student.enrollmentDate || student.createdAt) || ""

  return {
    universityName: "BAH HABAR GOBE",
    subtitle: options.subtitle || "Student’s Official Transcript",
    student: {
      studentName: studentName || "Student",
      studentId: String(student.studentId || ""),
      faculty,
      department,
      dateOfInitialEntry,
      degreeGranted: "",
      dateGranted: "",
      cgpa: Number.isFinite(cgpa) ? cgpa.toFixed(2) : "0.00",
    },
    terms: termRows,
    serialNumber: `TR-${String(student.studentId || student.id).replaceAll(" ", "").slice(0, 24)}`,
    dateOfIssue,
  }
}
