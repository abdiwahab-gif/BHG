import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { dbQuery } from "@/lib/db"
import { ensureFinanceCoreTables } from "../_db"
import { FinanceStudentsTableResolutionError, financeStudentsTableMeta, resolveFinanceStudentsTable } from "../_students"
import type { StudentAccount, StudentAccountFilters, StudentAccountListResponse } from "@/types/finance"

type DbStudentRow = RowDataPacket & {
  id: string
  firstName: string
  lastName: string
  studentNumber: string
  className: string
  sectionName: string
  createdAt: unknown
}

type DbAggRow = RowDataPacket & {
  studentId: string
  totalFeesDue: string | number | null
  totalPaid: string | number | null
  lastPaymentDate: unknown
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number.parseFloat(value)
  return Number(value || 0)
}

function toYmd(value: unknown): string | undefined {
  if (!value) return undefined
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, "0")
    const day = String(value.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  if (typeof value === "string") return value.length >= 10 ? value.slice(0, 10) : value
  return String(value)
}

async function getActiveSessionName(): Promise<string> {
  try {
    const rows = await dbQuery<RowDataPacket & { name: string }>(
      "SELECT name FROM sessions WHERE isActive = TRUE ORDER BY startDate DESC LIMIT 1",
      [],
    )
    const name = typeof rows?.[0]?.name === "string" ? rows[0].name.trim() : ""
    if (name) return name
  } catch {
    // ignore (session table might not exist yet in some envs)
  }

  const now = new Date()
  const year = now.getFullYear()
  return `${year}-${year + 1}`
}

async function getActiveSemesterName(activeSessionName: string): Promise<string> {
  try {
    const sessionRows = await dbQuery<RowDataPacket & { id: string }>(
      "SELECT id FROM sessions WHERE isActive = TRUE ORDER BY startDate DESC LIMIT 1",
      [],
    )
    const sessionId = typeof sessionRows?.[0]?.id === "string" ? sessionRows[0].id : ""
    if (!sessionId) return ""

    const semRows = await dbQuery<RowDataPacket & { name: string }>(
      "SELECT name FROM academic_module_semesters WHERE sessionId = ? ORDER BY startDate DESC LIMIT 1",
      [sessionId],
    )
    const name = typeof semRows?.[0]?.name === "string" ? semRows[0].name.trim() : ""
    return name
  } catch {
    return ""
  }
}

function buildStatus(totalFeesDue: number, totalPaid: number): StudentAccount["paymentStatus"] {
  const due = Math.max(0, totalFeesDue - totalPaid)
  if (totalFeesDue > 0 && due <= 0) return "PAID"
  if (totalPaid > 0 && due > 0) return "PARTIAL"
  return "CURRENT"
}

export async function GET(request: NextRequest) {
  try {
    await ensureFinanceCoreTables()

    let studentsTable: Awaited<ReturnType<typeof resolveFinanceStudentsTable>>
    try {
      studentsTable = await resolveFinanceStudentsTable()
    } catch (e) {
      if (e instanceof FinanceStudentsTableResolutionError) {
        return NextResponse.json({ error: "Student table resolution failed", message: e.message }, { status: e.status })
      }
      throw e
    }
    const meta = financeStudentsTableMeta(studentsTable)

    const { searchParams } = new URL(request.url)

    const filters: StudentAccountFilters = {
      program: searchParams.get("program") || undefined,
      level: searchParams.get("level") || undefined,
      academicYear: searchParams.get("academicYear") || undefined,
      semester: searchParams.get("semester") || undefined,
      paymentStatus: searchParams.get("paymentStatus") || undefined,
      search: searchParams.get("search") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "10"),
    }

    const page = Number.isFinite(filters.page) && (filters.page || 0) > 0 ? (filters.page as number) : 1
    const limit = Number.isFinite(filters.limit) && (filters.limit || 0) > 0 ? (filters.limit as number) : 10
    const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 100)
    const offset = Math.max(0, Math.floor((page - 1) * safeLimit))

    const fromSql =
      studentsTable === "students"
        ? "FROM students s LEFT JOIN users u ON u.id = s.userId"
        : "FROM academic_module_students s"

    const where: string[] = []
    const params: unknown[] = []

    if (filters.search) {
      const like = `%${filters.search}%`

      if (studentsTable === "students") {
        where.push("(u.name LIKE ? OR u.email LIKE ? OR s.studentId LIKE ?)")
        params.push(like, like, like)
      } else {
        where.push("(s.firstName LIKE ? OR s.lastName LIKE ? OR s.studentId LIKE ?)")
        params.push(like, like, like)
      }
    }

    // Map Finance 'program' filter to student className (best available field).
    if (meta.hasClassSection && filters.program && filters.program !== "all") {
      where.push("s.className = ?")
      params.push(filters.program)
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const countRows = await dbQuery<RowDataPacket & { total: string | number }>(
      `SELECT COUNT(*) as total ${fromSql} ${whereSql}`,
      params,
    )
    const total = Number(countRows?.[0]?.total ?? 0)

    const studentSelectSql =
      studentsTable === "students"
        ? `SELECT
            s.id as id,
            COALESCE(u.name, '') as firstName,
            '' as lastName,
            s.studentId as studentNumber,
            '' as className,
            '' as sectionName,
            s.createdAt as createdAt
          ${fromSql}
          ${whereSql}
          ORDER BY s.createdAt DESC
          LIMIT ${offset}, ${safeLimit}`
        : `SELECT
            s.id as id,
            s.firstName as firstName,
            s.lastName as lastName,
            s.studentId as studentNumber,
            s.className as className,
            s.sectionName as sectionName,
            s.createdAt as createdAt
          ${fromSql}
          ${whereSql}
          ORDER BY s.createdAt DESC
          LIMIT ${offset}, ${safeLimit}`

    const studentRows = await dbQuery<DbStudentRow>(studentSelectSql, params)

    const studentIds = (studentRows || []).map((s) => String(s.id)).filter(Boolean)

    let aggByStudent = new Map<string, DbAggRow>()
    if (studentIds.length) {
      const placeholders = studentIds.map(() => "?").join(",")
      const aggRows = await dbQuery<DbAggRow>(
        `SELECT
          studentId,
          SUM(CASE WHEN transactionType = 'CHARGE' THEN amount ELSE 0 END) as totalFeesDue,
          SUM(CASE WHEN transactionType = 'PAYMENT' THEN amount ELSE 0 END) as totalPaid,
          MAX(CASE WHEN transactionType = 'PAYMENT' THEN transactionDate ELSE NULL END) as lastPaymentDate
        FROM finance_student_transactions
        WHERE studentId IN (${placeholders})
        GROUP BY studentId`,
        studentIds,
      )
      aggByStudent = new Map((aggRows || []).map((r) => [String(r.studentId), r]))
    }

    const activeAcademicYear = await getActiveSessionName()
    const activeSemester = await getActiveSemesterName(activeAcademicYear)

    const accounts: StudentAccount[] = (studentRows || []).map((s) => {
      const studentUuid = String(s.id)
      const agg = aggByStudent.get(studentUuid)

      const totalFeesDue = toNumber(agg?.totalFeesDue)
      const totalPaid = toNumber(agg?.totalPaid)
      const balanceDue = Math.max(0, totalFeesDue - totalPaid)

      const paymentStatus = buildStatus(totalFeesDue, totalPaid)

      return {
        id: studentUuid,
        studentId: studentUuid,
        studentName: `${String(s.firstName)} ${String(s.lastName)}`.trim(),
        studentNumber: String(s.studentNumber || studentUuid),

        // No real program/level fields exist in the students table; map className/sectionName.
        program: String(s.className || ""),
        level: String(s.sectionName || ""),

        academicYear: filters.academicYear || activeAcademicYear,
        semester: filters.semester || activeSemester || "",

        accountBalance: balanceDue,
        totalFeesDue,
        totalPaid,
        totalOverdue: 0,
        lastPaymentDate: toYmd(agg?.lastPaymentDate),
        paymentStatus,

        // Back-compat fields (not used by current UI). Kept non-empty to avoid surprises.
        feeStructureId: "",
        feeStructure: {
          id: "",
          name: "",
          academicYear: filters.academicYear || activeAcademicYear,
          semester: filters.semester || activeSemester || "",
          program: String(s.className || ""),
          level: String(s.sectionName || ""),
          currency: "USD",
          totalAmount: totalFeesDue,
          dueDate: "",
          lateFeePenalty: 0,
          lateFeePercentage: 0,
          isActive: true,
          feeComponents: [],
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
        },
        transactions: [],
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      }
    })

    // Optional filter by computed payment status.
    const filteredAccounts = filters.paymentStatus
      ? accounts.filter((a) => a.paymentStatus === filters.paymentStatus)
      : accounts

    const response: StudentAccountListResponse = {
      studentAccounts: filteredAccounts,
      meta: {
        studentsTable,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }

    const res = NextResponse.json(response)
    res.headers.set("Cache-Control", "no-store")
    return res
  } catch (error) {
    console.error("Error fetching student accounts:", error)
    const res = NextResponse.json({ error: "Failed to fetch student accounts" }, { status: 500 })
    res.headers.set("Cache-Control", "no-store")
    return res
  }
}

// Back-compat: allow posting a payment without the /:id/payments route.
// Recommended: use POST /api/finance/student-accounts/:id/payments
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const studentId = typeof body?.studentId === "string" ? body.studentId.trim() : ""

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 })
    }

    // Re-route shape to the canonical endpoint.
    const paymentBody = {
      amount: body?.amount,
      paymentMethod: body?.paymentMethod,
      paymentDate: body?.paymentDate,
      reference: body?.reference,
      bankReference: body?.bankReference,
    }

    // Call the handler logic by delegating to the payments route via an internal fetch.
    // Note: This stays server-side and avoids duplicating validation logic.
    const url = new URL(request.url)
    url.pathname = `/api/finance/student-accounts/${encodeURIComponent(studentId)}/payments`

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(paymentBody),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error("Error processing student payment:", error)
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 })
  }
}
