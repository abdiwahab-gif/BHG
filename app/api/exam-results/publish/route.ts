import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { dbQuery, getDbPool } from "@/lib/db"
import { ensureStudentsTable } from "@/app/api/students/_db"
import { AuthService } from "@/lib/auth"

const bodySchema = z.object({
  studentId: z.string().min(1, "studentId is required"),
  sessionId: z.string().optional(),
  semesterId: z.string().optional(),
})

type DbStudentLookup = RowDataPacket & {
  id: string
  studentId: string
}

type DbCountRow = RowDataPacket & {
  total: number
  published: number
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
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

export async function POST(request: NextRequest) {
  try {
    await ensureExamResultsTable()
    await ensureStudentsTable()

    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")
    const userName = request.headers.get("x-user-name")

    if (!userId) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const user = {
      id: userId,
      role: (userRole as any) || "",
      name: userName || "",
      isActive: true,
      permissions: [],
    }

    if (!AuthService.hasPermission(user as any, "exam_results", "publish")) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 })
    }

    const body = bodySchema.parse(await request.json())
    const input = String(body.studentId || "").trim()

    const studentRows = await dbQuery<DbStudentLookup>(
      isUuid(input)
        ? "SELECT id, studentId FROM academic_module_students WHERE id = ? LIMIT 1"
        : "SELECT id, studentId FROM academic_module_students WHERE studentId = ? LIMIT 1",
      [input],
    )

    const student = studentRows[0]
    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 })
    }

    const countBeforeRows = await dbQuery<DbCountRow>(
      "SELECT COUNT(*) as total, SUM(isPublished = TRUE) as published FROM academic_module_exam_results WHERE studentId = ?",
      [student.id],
    )
    const totalBefore = Number(countBeforeRows?.[0]?.total || 0)
    const publishedBefore = Number(countBeforeRows?.[0]?.published || 0)

    const where: string[] = ["studentId = ?"]
    const params: string[] = [student.id]

    if (body.sessionId) {
      where.push("sessionId = ?")
      params.push(String(body.sessionId))
    }
    if (body.semesterId) {
      where.push("semesterId = ?")
      params.push(String(body.semesterId))
    }

    // Only update rows not already published.
    where.push("isPublished = FALSE")

    const modifiedBy = userId
    const modifiedAt = new Date()

    const updateSql = `UPDATE academic_module_exam_results
      SET isPublished = TRUE, modifiedBy = ?, modifiedAt = ?
      WHERE ${where.join(" AND ")}`

    const execParams: Array<string | Date> = [modifiedBy, modifiedAt, ...params]
    const pool = getDbPool() as any
    const [result] = await pool.execute(updateSql, execParams)
    const affectedRows = Number((result as any)?.affectedRows ?? 0)

    const countAfterRows = await dbQuery<DbCountRow>(
      "SELECT COUNT(*) as total, SUM(isPublished = TRUE) as published FROM academic_module_exam_results WHERE studentId = ?",
      [student.id],
    )
    const totalAfter = Number(countAfterRows?.[0]?.total || 0)
    const publishedAfter = Number(countAfterRows?.[0]?.published || 0)

    return NextResponse.json({
      success: true,
      data: {
        studentId: String(student.studentId),
        publishedCount: affectedRows,
        totalResults: totalAfter,
        publishedBefore,
        publishedAfter,
        totalBefore,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Validation failed", details: error.errors }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Failed to publish results"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
