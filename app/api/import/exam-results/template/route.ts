import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"

import { dbQuery } from "@/lib/db"
import { AuthService } from "@/lib/auth"

type DbStudentIdRow = RowDataPacket & { studentId: string }
type DbCourseRow = RowDataPacket & { id: string; code: string | null }
type DbSessionRow = RowDataPacket & { id: string; name: string }
type DbSemesterRow = RowDataPacket & { name: string }
type DbExamTypeRow = RowDataPacket & { code: string }

function csvEscape(value: unknown): string {
  const s = String(value ?? "")
  if (/[\r\n,\"]/g.test(s)) return `"${s.replace(/\"/g, '""')}"`
  return s
}

export async function GET(request: NextRequest) {
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

  const headers = [
    "student_id",
    "course_id",
    "course_code",
    "academic_year",
    "semester",
    "mid_score",
    "final_score",
    "assignment_score",
    "attendance_score",
    "comments",
  ]

  let studentIds: string[] = []
  let courseId = ""
  let courseCode = ""
  let sessionId = ""
  let academicYear = ""
  let semester = ""

  let hasMid = true
  let hasFinal = true
  let hasAssign = true
  let hasAttendance = true

  try {
    const examTypeRows = await dbQuery<DbExamTypeRow>(
      "SELECT code FROM academic_module_exam_types WHERE isActive = TRUE",
      [],
    ).catch(() => [])
    const codes = new Set((examTypeRows || []).map((r) => String(r.code || "").trim().toUpperCase()).filter(Boolean))
    hasMid = codes.has("MID") || codes.has("MIDTERM")
    hasFinal = codes.has("FINAL")
    hasAssign = codes.has("ASSIGN") || codes.has("ASSIGNMENT")
    hasAttendance = codes.has("ATTENDANCE") || codes.has("ATT")

    const studentRows = await dbQuery<DbStudentIdRow>(
      "SELECT studentId FROM academic_module_students ORDER BY createdAt DESC LIMIT 2",
      [],
    ).catch(() => [])
    studentIds = (studentRows || []).map((r) => String(r.studentId || "").trim()).filter(Boolean)

    const courseRows = await dbQuery<DbCourseRow>(
      "SELECT id, code FROM academic_module_courses WHERE code IS NOT NULL AND code <> '' ORDER BY createdAt DESC LIMIT 1",
      [],
    ).catch(() => [])
    if (courseRows?.length) {
      courseId = String(courseRows[0].id || "").trim()
      courseCode = String(courseRows[0].code || "").trim()
    }

    const sessionRows = await dbQuery<DbSessionRow>("SELECT id, name FROM sessions ORDER BY createdAt DESC LIMIT 1", []).catch(() => [])
    if (sessionRows?.length) {
      sessionId = String(sessionRows[0].id || "").trim()
      academicYear = String(sessionRows[0].name || "").trim()
    }

    if (sessionId) {
      const semesterRows = await dbQuery<DbSemesterRow>(
        "SELECT name FROM academic_module_semesters WHERE sessionId = ? ORDER BY createdAt DESC LIMIT 1",
        [sessionId],
      ).catch(() => [])
      if (semesterRows?.length) {
        semester = String(semesterRows[0].name || "").trim()
      }
    }
  } catch {
    // Fall back to placeholders below.
  }

  const fallbackStudentId = studentIds[0] || "STUDENT_ID_FROM_DB"
  const fallbackStudentId2 = studentIds[1] || fallbackStudentId
  const fallbackCourseCode = courseCode || "COURSE_CODE_FROM_DB"
  const fallbackCourseId = courseId || ""
  const fallbackAcademicYear = academicYear || "SESSION_NAME_FROM_DB"
  const fallbackSemester = semester || "SEMESTER_NAME_FROM_DB"

  const rows: Array<Record<string, string | number>> = [
    {
      student_id: fallbackStudentId,
      course_id: fallbackCourseId,
      course_code: fallbackCourseCode,
      academic_year: fallbackAcademicYear,
      semester: fallbackSemester,
      mid_score: hasMid ? 14 : "",
      final_score: hasFinal ? 45 : "",
      assignment_score: hasAssign ? 8 : "",
      attendance_score: hasAttendance ? 9 : "",
      comments: "Imported in one row",
    },
    {
      student_id: fallbackStudentId2,
      course_id: fallbackCourseId,
      course_code: fallbackCourseCode,
      academic_year: fallbackAcademicYear,
      semester: fallbackSemester,
      mid_score: hasMid ? 16 : "",
      final_score: hasFinal ? 41 : "",
      assignment_score: "",
      attendance_score: hasAttendance ? 8 : "",
      comments: "Missing assignment score is allowed",
    },
  ]

  const csv =
    `${headers.join(",")}\n` +
    rows
      .map((r) => headers.map((h) => csvEscape((r as any)[h] ?? "")).join(","))
      .join("\n") +
    "\n"

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=exam-results-import-template.csv",
    },
  })
}
