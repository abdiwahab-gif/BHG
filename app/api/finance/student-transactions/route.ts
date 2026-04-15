import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"

import { dbQuery } from "@/lib/db"
import { ensureFinanceCoreTables } from "../_db"
import { FinanceStudentsTableResolutionError, resolveFinanceStudentsTable } from "../_students"

type DbPaymentRow = RowDataPacket & {
  id: string
  studentId: string
  transactionType: string
  amount: string | number
  description: string
  reference: string | null
  paymentMethod: string | null
  receiptNumber: string | null
  bankReference: string | null
  processedBy: string
  academicYear: string
  semester: string
  transactionDate: unknown
  createdAt: unknown

  studentName: string | null
  studentNumber: string | null
}

function toYmd(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, "0")
    const day = String(value.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  if (typeof value === "string") return value.length >= 10 ? value.slice(0, 10) : value
  return String(value ?? "")
}

export async function GET(request: NextRequest) {
  try {
    await ensureFinanceCoreTables()

    let studentsTable: Awaited<ReturnType<typeof resolveFinanceStudentsTable>>
    try {
      studentsTable = await resolveFinanceStudentsTable()
    } catch (e) {
      if (e instanceof FinanceStudentsTableResolutionError) {
        return NextResponse.json({ success: false, error: "Student table resolution failed", message: e.message }, { status: e.status })
      }
      throw e
    }

    const { searchParams } = new URL(request.url)
    const studentId = String(searchParams.get("studentId") || "").trim()
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "25", 10) || 25))
    const offset = (page - 1) * limit

    const where: string[] = ["t.transactionType = 'PAYMENT'"]
    const params: unknown[] = []

    if (studentId) {
      where.push("t.studentId = ?")
      params.push(studentId)
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const joinSql =
      studentsTable === "students"
        ? "LEFT JOIN students s ON s.id = t.studentId LEFT JOIN users u ON u.id = s.userId"
        : "LEFT JOIN academic_module_students s ON s.id = t.studentId"

    const studentNameSql =
      studentsTable === "students" ? "NULLIF(TRIM(COALESCE(u.name, '')), '')" : "NULLIF(TRIM(CONCAT(COALESCE(s.firstName,''),' ',COALESCE(s.lastName,''))), '')"

    const studentNumberSql = studentsTable === "students" ? "NULLIF(TRIM(COALESCE(s.studentId, '')), '')" : "NULLIF(TRIM(COALESCE(s.studentId, '')), '')"

    const countRows = await dbQuery<RowDataPacket & { total: string | number }>(
      `SELECT COUNT(*) as total FROM finance_student_transactions t ${joinSql} ${whereSql}`,
      params,
    )
    const total = Number(countRows?.[0]?.total ?? 0)

    const rows = await dbQuery<DbPaymentRow>(
      `SELECT
        t.id, t.studentId, t.transactionType, t.amount, t.description, t.reference, t.paymentMethod,
        t.receiptNumber, t.bankReference, t.processedBy, t.academicYear, t.semester, t.transactionDate, t.createdAt,
        ${studentNameSql} as studentName,
        ${studentNumberSql} as studentNumber
      FROM finance_student_transactions t
      ${joinSql}
      ${whereSql}
      ORDER BY t.transactionDate DESC, t.createdAt DESC
      LIMIT ${offset}, ${limit}`,
      params,
    )

    const items = (rows || []).map((r) => ({
      id: String(r.id),
      studentId: String(r.studentId),
      amount: Number(r.amount),
      description: String(r.description || ""),
      reference: r.reference ? String(r.reference) : "",
      paymentMethod: r.paymentMethod ? String(r.paymentMethod) : "",
      receiptNumber: r.receiptNumber ? String(r.receiptNumber) : "",
      bankReference: r.bankReference ? String(r.bankReference) : "",
      processedBy: String(r.processedBy || "system"),
      academicYear: String(r.academicYear || ""),
      semester: String(r.semester || ""),
      transactionDate: toYmd(r.transactionDate),
      createdAt: toYmd(r.createdAt),
      student: {
        name: r.studentName ? String(r.studentName) : "",
        studentNumber: r.studentNumber ? String(r.studentNumber) : "",
      },
    }))

    return NextResponse.json({
      success: true,
      data: {
        items,
        page,
        limit,
        total,
      },
    })
  } catch (error) {
    console.error("[GET /api/finance/student-transactions]", error)
    const message = error instanceof Error ? error.message : "Failed to list payments"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
