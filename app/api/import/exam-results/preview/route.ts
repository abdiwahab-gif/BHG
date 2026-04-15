import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import crypto from "crypto"
import { z } from "zod"

import { ensureExamResultsImportTables } from "../_db"
import { dbQuery } from "@/lib/db"
import { AuthService } from "@/lib/auth"

type ImportRowError = { field: string; message: string; value?: string }

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\uFFFD/g, "")
    .replace(/[\u0000-\u001F]+/g, " ")
    .trim()
}

function parseAcademicYear(value: string): string {
  const v = cleanText(value)
  const m = v.match(/(\d{4})\s*[\/-]\s*(\d{4})/)
  if (!m) return v
  return `${m[1]}/${m[2]}`
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex")
}

function toNumber(value: string): number | null {
  const v = cleanText(value)
  if (!v) return null
  const n = Number.parseFloat(v)
  return Number.isFinite(n) ? n : null
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

const mappingSchema = z
  .object({
    studentId: z.string().min(1),
    courseId: z.string().optional(),
    courseCode: z.string().optional(),
    courseName: z.string().optional(),
    academicYear: z.string().min(1),
    semester: z.string().min(1),
    midScore: z.string().optional(),
    finalScore: z.string().optional(),
    assignmentScore: z.string().optional(),
    attendanceScore: z.string().optional(),
    comments: z.string().optional(),
  })
  .strict()

const bodySchema = z
  .object({
    jobId: z.string().uuid(),
    mapping: mappingSchema,
  })
  .strict()

type DbImportRow = RowDataPacket & {
  id: string
  rowNumber: number
  rawJson: string
}

type DbExamTypeRow = RowDataPacket & { id: string; code: string; weight: number | string | null }
type DbStudentRow = RowDataPacket & { id: string; studentId: string }
type DbCourseRow = RowDataPacket & { id: string; code: string; name: string }
type DbSessionRow = RowDataPacket & { id: string; name: string }
type DbSemesterRow = RowDataPacket & { id: string; sessionId: string; name: string }

function getCell(raw: Record<string, string>, header: string | undefined): string {
  if (!header) return ""
  return cleanText(raw[header])
}

type OperationSpec = {
  examTypeCode: "MID" | "FINAL" | "ASSIGNMENT" | "ATTENDANCE"
  scoreRaw: string
  maxScore: number
  opKey: string
  scoreField: string
}

function courseRefForKey(courseId: string, courseCode: string, courseName: string): string {
  return cleanText(courseId || courseCode || courseName).toLowerCase()
}

function buildOpsForRow(args: {
  studentId: string
  courseRef: string
  academicYear: string
  semester: string
  midScoreRaw: string
  finalScoreRaw: string
  assignmentScoreRaw: string
  attendanceScoreRaw: string
  resolveMaxScore: (examTypeCode: OperationSpec["examTypeCode"]) => number
}): OperationSpec[] {
  const baseKeyParts = [args.studentId.toLowerCase(), args.courseRef, args.academicYear.toLowerCase(), args.semester.toLowerCase()]

  const ops: OperationSpec[] = []
  const pushIfPresent = (spec: Omit<OperationSpec, "opKey">) => {
    const hasScore = Boolean(cleanText(spec.scoreRaw))
    if (!hasScore) return
    const opKey = sha256Hex([...baseKeyParts, spec.examTypeCode].join("|"))
    ops.push({ ...spec, opKey })
  }

  pushIfPresent({
    examTypeCode: "MID",
    scoreRaw: args.midScoreRaw,
    maxScore: args.resolveMaxScore("MID"),
    scoreField: "mid_score",
  })
  pushIfPresent({
    examTypeCode: "FINAL",
    scoreRaw: args.finalScoreRaw,
    maxScore: args.resolveMaxScore("FINAL"),
    scoreField: "final_score",
  })
  pushIfPresent({
    examTypeCode: "ASSIGNMENT",
    scoreRaw: args.assignmentScoreRaw,
    maxScore: args.resolveMaxScore("ASSIGNMENT"),
    scoreField: "assignment_score",
  })
  pushIfPresent({
    examTypeCode: "ATTENDANCE",
    scoreRaw: args.attendanceScoreRaw,
    maxScore: args.resolveMaxScore("ATTENDANCE"),
    scoreField: "attendance_score",
  })

  return ops
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")
    const userName = request.headers.get("x-user-name")

    if (!userId) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
    }

    const user = {
      id: userId,
      role: (userRole as any) || "student",
      name: userName || "",
      isActive: true,
      email: "",
      permissions: [],
      createdAt: new Date(0),
    } as any

    if (!AuthService.hasPermission(user, "exam_results", "create") && !AuthService.hasPermission(user, "exam_results", "update")) {
      return NextResponse.json({ success: false, message: "Insufficient permissions" }, { status: 403 })
    }

    await ensureExamResultsImportTables()

    const json = await request.json().catch(() => null)
    const parsedBody = bodySchema.safeParse(json)
    if (!parsedBody.success) {
      return NextResponse.json({ success: false, message: "Invalid request", details: parsedBody.error.errors }, { status: 400 })
    }

    const { jobId, mapping } = parsedBody.data
    if (!mapping.courseId && !mapping.courseCode && !mapping.courseName) {
      return NextResponse.json({ success: false, message: "Map courseId, courseCode, or courseName" }, { status: 400 })
    }
    if (!mapping.midScore && !mapping.finalScore && !mapping.assignmentScore && !mapping.attendanceScore) {
      return NextResponse.json({ success: false, message: "Map at least one score column (mid/final/assignment/attendance)" }, { status: 400 })
    }

    const jobRows = await dbQuery<RowDataPacket & { id: string; status: string }>(
      "SELECT id, status FROM exam_result_import_jobs WHERE id = ? LIMIT 1",
      [jobId],
    )
    if (!jobRows.length) {
      return NextResponse.json({ success: false, message: "Import job not found" }, { status: 404 })
    }

    const examTypeRows = await dbQuery<DbExamTypeRow>(
      "SELECT id, code, weight FROM academic_module_exam_types WHERE isActive = TRUE",
      [],
    ).catch(() => [])
    const examTypeByCode = new Map<string, { id: string; weight: number }>()
    for (const r of examTypeRows || []) {
      const code = cleanText((r as any).code).toUpperCase()
      const weightRaw = (r as any).weight
      const weight = weightRaw === null || weightRaw === undefined ? 0 : Number(weightRaw)
      examTypeByCode.set(code, { id: String((r as any).id), weight: Number.isFinite(weight) ? weight : 0 })
    }

    const resolveExamTypeId = (code: OperationSpec["examTypeCode"]): string | undefined => {
      const upper = String(code).toUpperCase()
      if (upper === "ASSIGNMENT") return (examTypeByCode.get("ASSIGNMENT") || examTypeByCode.get("ASSIGN"))?.id
      if (upper === "MID") return (examTypeByCode.get("MID") || examTypeByCode.get("MIDTERM"))?.id
      if (upper === "FINAL") return examTypeByCode.get("FINAL")?.id
      if (upper === "ATTENDANCE") return (examTypeByCode.get("ATTENDANCE") || examTypeByCode.get("ATT"))?.id
      return examTypeByCode.get(upper)?.id
    }

    const resolveMaxScore = (code: OperationSpec["examTypeCode"]): number => {
      const upper = String(code).toUpperCase()

      const weightFor = (...codes: string[]): number | undefined => {
        for (const c of codes) {
          const item = examTypeByCode.get(c)
          const w = item?.weight
          if (typeof w === "number" && Number.isFinite(w) && w > 0) return w
        }
        return undefined
      }

      if (upper === "MID") return weightFor("MID", "MIDTERM") ?? 30
      if (upper === "FINAL") return weightFor("FINAL") ?? 50
      if (upper === "ASSIGNMENT") return weightFor("ASSIGNMENT", "ASSIGN") ?? 10
      if (upper === "ATTENDANCE") return weightFor("ATTENDANCE", "ATT") ?? 10
      return 100
    }

    // Pass 1: detect duplicate operations across the entire import job (by opKey).
    const opKeyCounts = new Map<string, number>()
    {
      const chunkSize = 500
      let lastRowNumber = 0
      while (true) {
        const rows = await dbQuery<DbImportRow>(
          `SELECT id, rowNumber, rawJson FROM exam_result_import_rows WHERE jobId = ? AND rowNumber > ? ORDER BY rowNumber ASC LIMIT ${chunkSize}`,
          [jobId, lastRowNumber],
        )
        if (!rows.length) break
        lastRowNumber = Number(rows[rows.length - 1].rowNumber || lastRowNumber)

        for (const r of rows) {
          const raw = (JSON.parse(String(r.rawJson || "{}")) || {}) as Record<string, string>

          const studentId = getCell(raw, mapping.studentId)
          const courseId = getCell(raw, mapping.courseId)
          const courseCode = getCell(raw, mapping.courseCode)
          const courseName = getCell(raw, mapping.courseName)
          const academicYear = parseAcademicYear(getCell(raw, mapping.academicYear))
          const semester = cleanText(getCell(raw, mapping.semester))
          const courseRef = courseRefForKey(courseId, courseCode, courseName)
          if (!studentId || !courseRef || !academicYear || !semester) continue

          const ops = buildOpsForRow({
            studentId,
            courseRef,
            academicYear,
            semester,
            midScoreRaw: getCell(raw, mapping.midScore),
            finalScoreRaw: getCell(raw, mapping.finalScore),
            assignmentScoreRaw: getCell(raw, mapping.assignmentScore),
            attendanceScoreRaw: getCell(raw, mapping.attendanceScore),
            resolveMaxScore,
          })

          for (const op of ops) {
            opKeyCounts.set(op.opKey, (opKeyCounts.get(op.opKey) ?? 0) + 1)
          }
        }
      }
    }

    const duplicateOpKeys = new Set<string>()
    for (const [k, count] of opKeyCounts) {
      if (count > 1) duplicateOpKeys.add(k)
    }

    // Pass 2: validate and compute preview/actions.
    let total = 0
    let valid = 0
    let invalid = 0
    let inserts = 0
    let updates = 0

    const previewRows: Array<{
      operationId: string
      rowNumber: number
      studentId: string
      course: string
      examTypeCode: string
      academicYear: string
      semester: string
      score: number
      maxScore: number
      errors: ImportRowError[]
      action?: string
    }> = []

    const chunkSize = 300
    let lastRowNumber = 0

    while (true) {
      const rows = await dbQuery<DbImportRow>(
        `SELECT id, rowNumber, rawJson FROM exam_result_import_rows WHERE jobId = ? AND rowNumber > ? ORDER BY rowNumber ASC LIMIT ${chunkSize}`,
        [jobId, lastRowNumber],
      )
      if (!rows.length) break
      lastRowNumber = Number(rows[rows.length - 1].rowNumber || lastRowNumber)

      const normalizedById = new Map<string, any>()
      const baseErrorsById = new Map<string, ImportRowError[]>()
      const rowErrorsById = new Map<string, ImportRowError[]>()

      const studentIds: string[] = []
      const courseIds: string[] = []
      const courseCodes: string[] = []
      const courseNames: string[] = []
      const sessionNames: string[] = []
      const semesterNames: string[] = []

      // Parse rows and build per-row normalized structure + per-op validation errors.
      for (const r of rows) {
        const raw = (JSON.parse(String(r.rawJson || "{}")) || {}) as Record<string, string>
        const baseErrs: ImportRowError[] = []

        const studentId = getCell(raw, mapping.studentId)
        const courseId = getCell(raw, mapping.courseId)
        const courseCode = getCell(raw, mapping.courseCode)
        const courseName = getCell(raw, mapping.courseName)
        const academicYear = parseAcademicYear(getCell(raw, mapping.academicYear))
        const semester = cleanText(getCell(raw, mapping.semester))
        const comments = getCell(raw, mapping.comments)
        const courseRef = courseRefForKey(courseId, courseCode, courseName)

        if (!studentId) baseErrs.push({ field: "student_id", message: "Required", value: "" })
        if (!courseRef) baseErrs.push({ field: "course", message: "courseId or courseCode or courseName is required" })
        if (!academicYear) baseErrs.push({ field: "academic_year", message: "Required" })
        if (!semester) baseErrs.push({ field: "semester", message: "Required" })

        const ops = buildOpsForRow({
          studentId,
          courseRef,
          academicYear,
          semester,
          midScoreRaw: getCell(raw, mapping.midScore),
          finalScoreRaw: getCell(raw, mapping.finalScore),
          assignmentScoreRaw: getCell(raw, mapping.assignmentScore),
          attendanceScoreRaw: getCell(raw, mapping.attendanceScore),
          resolveMaxScore,
        })

        if (!ops.length) {
          baseErrs.push({ field: "scores", message: "At least one score is required (mid/final/assignment/attendance)" })
        }

        const operations: Array<any> = []
        for (const op of ops) {
          const opErrs: ImportRowError[] = []
          if (duplicateOpKeys.has(op.opKey)) {
            opErrs.push({ field: "row", message: `Duplicate ${op.examTypeCode} record detected in this file` })
          }

          const score = toNumber(op.scoreRaw)
          if (score === null) opErrs.push({ field: op.scoreField, message: "Invalid number", value: op.scoreRaw })
          const maxScore = Number(op.maxScore)
          if (!Number.isFinite(maxScore) || maxScore <= 0) {
            opErrs.push({ field: "exam_type", message: `Max score not configured for ${op.examTypeCode}. Set a positive weight for this exam type.`, value: String(op.examTypeCode || "") })
          }

          if (score !== null) {
            if (score < 0) opErrs.push({ field: op.scoreField, message: "Must be >= 0", value: String(score) })
            if (Number.isFinite(maxScore) && maxScore > 0 && score > maxScore) {
              opErrs.push({ field: op.scoreField, message: "Score cannot exceed max score", value: String(score) })
            }
          }

          operations.push({
            operationId: `${String(r.id)}:${op.examTypeCode}`,
            examTypeCode: op.examTypeCode,
            score,
            maxScore,
            comments,
            opKey: op.opKey,
            errors: opErrs,
          })
        }

        const normalized = {
          studentId,
          courseId,
          courseCode,
          courseName,
          academicYear,
          semester,
          comments,
          operations,
        }

        normalizedById.set(String(r.id), normalized)

        baseErrorsById.set(String(r.id), baseErrs)

        if (studentId) studentIds.push(studentId)
        if (courseId) courseIds.push(courseId)
        if (courseCode) courseCodes.push(courseCode)
        if (courseName) courseNames.push(courseName)
        if (academicYear) sessionNames.push(academicYear)
        if (semester) semesterNames.push(semester)
      }

      const uniq = (arr: string[]) => Array.from(new Set(arr.map((s) => cleanText(s)).filter(Boolean)))
      const uniqStudentIds = uniq(studentIds)
      const uniqCourseIds = uniq(courseIds)
      const uniqCourseCodes = uniq(courseCodes)
      const uniqCourseNames = uniq(courseNames)
      const uniqSessions = uniq(sessionNames)
      const uniqSemesters = uniq(semesterNames)

      const studentByStudentId = new Map<string, string>()
      if (uniqStudentIds.length) {
        const placeholders = uniqStudentIds.map(() => "?").join(",")
        const students = await dbQuery<DbStudentRow>(
          `SELECT id, studentId FROM academic_module_students WHERE studentId IN (${placeholders})`,
          uniqStudentIds,
        ).catch(() => [])
        for (const s of students || []) {
          studentByStudentId.set(cleanText(s.studentId), String(s.id))
        }
      }

      const courseById = new Map<string, string>()
      if (uniqCourseIds.length) {
        const placeholders = uniqCourseIds.map(() => "?").join(",")
        const courses = await dbQuery<RowDataPacket & { id: string }>(
          `SELECT id FROM academic_module_courses WHERE id IN (${placeholders})`,
          uniqCourseIds,
        ).catch(() => [])
        for (const c of courses || []) {
          courseById.set(String((c as any).id), String((c as any).id))
        }
      }

      const courseByCode = new Map<string, string>()
      if (uniqCourseCodes.length) {
        const placeholders = uniqCourseCodes.map(() => "?").join(",")
        const courses = await dbQuery<DbCourseRow>(
          `SELECT id, code, name FROM academic_module_courses WHERE code IS NOT NULL AND code <> '' AND UPPER(code) IN (${placeholders})`,
          uniqCourseCodes.map((c) => cleanText(c).toUpperCase()),
        ).catch(() => [])
        for (const c of courses || []) {
          courseByCode.set(cleanText(c.code).toUpperCase(), String(c.id))
        }
      }

      const courseByName = new Map<string, string>()
      if (uniqCourseNames.length) {
        const placeholders = uniqCourseNames.map(() => "?").join(",")
        const courses = await dbQuery<DbCourseRow>(
          `SELECT id, code, name FROM academic_module_courses WHERE LOWER(name) IN (${placeholders})`,
          uniqCourseNames.map((n) => cleanText(n).toLowerCase()),
        ).catch(() => [])
        for (const c of courses || []) {
          courseByName.set(cleanText(c.name).toLowerCase(), String(c.id))
        }
      }

      const sessionByName = new Map<string, string>()
      if (uniqSessions.length) {
        const placeholders = uniqSessions.map(() => "?").join(",")
        const sessions = await dbQuery<DbSessionRow>(
          `SELECT id, name FROM sessions WHERE LOWER(name) IN (${placeholders})`,
          uniqSessions.map((s) => cleanText(s).toLowerCase()),
        ).catch(() => [])
        for (const s of sessions || []) {
          sessionByName.set(cleanText(s.name).toLowerCase(), String(s.id))
        }
      }

      // Map semesters by (sessionId, lower(name)) tuple.
      const sessionIds = Array.from(new Set(Array.from(sessionByName.values())))
      const semesterBySessionAndName = new Map<string, string>()
      if (sessionIds.length && uniqSemesters.length) {
        const placeholdersSession = sessionIds.map(() => "?").join(",")
        const placeholdersName = uniqSemesters.map(() => "?").join(",")
        const semesters = await dbQuery<DbSemesterRow>(
          `SELECT id, sessionId, name FROM academic_module_semesters WHERE sessionId IN (${placeholdersSession}) AND LOWER(name) IN (${placeholdersName})`,
          [...sessionIds, ...uniqSemesters.map((s) => cleanText(s).toLowerCase())],
        ).catch(() => [])
        for (const s of semesters || []) {
          semesterBySessionAndName.set(`${String(s.sessionId)}|${cleanText(s.name).toLowerCase()}`, String(s.id))
        }
      }

      // Second pass: attach resolved ids and compute existence-based actions per operation.
      const compositeKeys: string[] = []
      const compositeKeyByOperationId = new Map<string, string>()

      for (const r of rows) {
        const id = String(r.id)
        const normalized = normalizedById.get(id)
        const baseErrs = baseErrorsById.get(id) || []

        const studentUuid = normalized?.studentId ? studentByStudentId.get(normalized.studentId) : undefined
        if (normalized?.studentId && !studentUuid) {
          baseErrs.push({ field: "student_id", message: "Student not found", value: normalized.studentId })
        }

        let courseUuid: string | undefined
        if (normalized?.courseId) courseUuid = courseById.get(String(normalized.courseId))
        if (!courseUuid && normalized?.courseCode) courseUuid = courseByCode.get(cleanText(normalized.courseCode).toUpperCase())
        if (!courseUuid && normalized?.courseName) courseUuid = courseByName.get(cleanText(normalized.courseName).toLowerCase())

        if ((normalized?.courseId || normalized?.courseCode || normalized?.courseName) && !courseUuid) {
          baseErrs.push({ field: "course", message: "Course not found", value: normalized.courseId || normalized.courseCode || normalized.courseName })
        }

        const sessionId = normalized?.academicYear ? sessionByName.get(cleanText(normalized.academicYear).toLowerCase()) : undefined
        if (normalized?.academicYear && !sessionId) {
          baseErrs.push({ field: "academic_year", message: "Session not found. Create the session first.", value: normalized.academicYear })
        }

        const semesterId = sessionId && normalized?.semester ? semesterBySessionAndName.get(`${sessionId}|${cleanText(normalized.semester).toLowerCase()}`) : undefined
        if (sessionId && normalized?.semester && !semesterId) {
          baseErrs.push({ field: "semester", message: "Semester not found for this session. Create the semester first.", value: normalized.semester })
        }

        normalized.studentUuid = studentUuid
        normalized.courseUuid = courseUuid
        normalized.sessionId = sessionId
        normalized.semesterId = semesterId

        const ops: any[] = Array.isArray(normalized.operations) ? normalized.operations : []
        for (const op of ops) {
          const opErrs: ImportRowError[] = Array.isArray(op.errors) ? op.errors : []
          const examTypeId = resolveExamTypeId(op.examTypeCode)
          if (!examTypeId) {
            opErrs.push({ field: "exam_type", message: "Exam type not found", value: String(op.examTypeCode || "") })
          }

          op.examTypeId = examTypeId

          const baseOk = Boolean(studentUuid && courseUuid && sessionId && semesterId)
          const opOk = Boolean(examTypeId && op.score !== null && op.maxScore !== null)
          if (baseOk && opOk && opErrs.length === 0) {
            const compositeKey = `${studentUuid}|${courseUuid}|${examTypeId}|${sessionId}|${semesterId}`
            compositeKeys.push(compositeKey)
            compositeKeyByOperationId.set(String(op.operationId), compositeKey)

            const score = Number(op.score)
            const maxScore = Number(op.maxScore)
            const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
            op.percentage = percentage
            op.gradePoint = calculateGradePoint(percentage)
            op.letterGrade = calculateLetterGrade(percentage)
          }

          op.errors = opErrs
        }

        // re-flatten errors
        baseErrorsById.set(id, baseErrs)
        const flattened: ImportRowError[] = [...baseErrs]
        for (const op of ops) {
          for (const e of op.errors || []) flattened.push(e)
        }
        rowErrorsById.set(id, flattened)
      }

      const existingByCompositeKey = new Map<string, string>()
      if (compositeKeys.length) {
        const placeholders = compositeKeys.map(() => "?").join(",")
        const existing = await dbQuery<RowDataPacket & { k: string; id: string }>(
          `SELECT
            CONCAT(studentId,'|',courseId,'|',examTypeId,'|',sessionId,'|',semesterId) as k,
            id
          FROM academic_module_exam_results
          WHERE CONCAT(studentId,'|',courseId,'|',examTypeId,'|',sessionId,'|',semesterId) IN (${placeholders})`,
          compositeKeys,
        ).catch(() => [])
        for (const e of existing || []) {
          existingByCompositeKey.set(String((e as any).k), String((e as any).id))
        }
      }

      for (const r of rows) {
        const id = String(r.id)
        const normalized = normalizedById.get(id)
        const baseErrs = baseErrorsById.get(id) || []
        const rowErrs = rowErrorsById.get(id) || []

        const ops: any[] = Array.isArray(normalized?.operations) ? normalized.operations : []
        for (const op of ops) {
          total += 1
          const opErrs: ImportRowError[] = Array.isArray(op.errors) ? op.errors : []
          const compositeKey = compositeKeyByOperationId.get(String(op.operationId))
          const exists = compositeKey ? existingByCompositeKey.has(compositeKey) : false
          const action = exists ? "UPDATE" : "INSERT"
          op.action = action

          if (baseErrs.length || opErrs.length) {
            invalid += 1
          } else {
            valid += 1
            if (action === "INSERT") inserts += 1
            else updates += 1
          }

          if (previewRows.length < 50) {
            previewRows.push({
              operationId: String(op.operationId),
              rowNumber: Number(r.rowNumber),
              studentId: String(normalized?.studentId || ""),
              course: String(normalized?.courseId || normalized?.courseCode || normalized?.courseName || ""),
              examTypeCode: String(op.examTypeCode || ""),
              academicYear: String(normalized?.academicYear || ""),
              semester: String(normalized?.semester || ""),
              score: Number(op.score ?? 0),
              maxScore: Number(op.maxScore ?? 100),
              errors: [...(baseErrs || []), ...(opErrs || [])],
              action,
            })
          }
        }

        const errorsJson = rowErrs.length ? JSON.stringify(rowErrs) : null
        const normalizedJson = normalized ? JSON.stringify(normalized) : null
        await dbQuery(
          "UPDATE exam_result_import_rows SET normalizedJson = ?, errorsJson = ?, action = ?, rowKey = ? WHERE id = ?",
          [normalizedJson, errorsJson, null, null, id],
        )
      }
    }

    const stats = { total, valid, invalid, inserts, updates }
    await dbQuery(
      "UPDATE exam_result_import_jobs SET status = 'VALIDATED', mappingJson = ?, statsJson = ? WHERE id = ?",
      [JSON.stringify(mapping), JSON.stringify(stats), jobId],
    )

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        stats,
        previewRows,
      },
    })
  } catch (error) {
    console.error("[POST /api/import/exam-results/preview]", error)
    const message = error instanceof Error ? error.message : "Failed to preview import"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
