import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { dbQuery, getDbPool } from "@/lib/db"
import { ensureFinanceCoreTables } from "../_db"
import type { PayrollFilters, PayrollListResponse, PayrollRun } from "@/types/finance"

export const runtime = "nodejs"

type DbPayrollRow = RowDataPacket & {
  id: string
  payrollNumber: string
  payPeriodStart: unknown
  payPeriodEnd: unknown
  payDate: unknown
  status: string
  totalGrossPay: string | number
  totalDeductions: string | number
  totalNetPay: string | number
  employeeCount: number
  journalEntryId: string | null
  processedBy: string
  processedById: string
  approvedBy: string | null
  approvedById: string | null
  approvedAt: unknown
  createdAt: unknown
  updatedAt: unknown
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number.parseFloat(value)
  return Number(value || 0)
}

function toIso(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString()
  const s = String(value || "")
  return s || new Date().toISOString()
}

function toYmd(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  const s = String(value || "")
  return s.length >= 10 ? s.slice(0, 10) : s
}

function mapPayroll(row: DbPayrollRow): PayrollRun {
  return {
    id: String(row.id),
    payrollNumber: String(row.payrollNumber),
    payPeriodStart: toYmd(row.payPeriodStart),
    payPeriodEnd: toYmd(row.payPeriodEnd),
    payDate: toYmd(row.payDate),
    status: String(row.status) as PayrollRun["status"],
    totalGrossPay: toNumber(row.totalGrossPay),
    totalDeductions: toNumber(row.totalDeductions),
    totalNetPay: toNumber(row.totalNetPay),
    employeeCount: Number(row.employeeCount || 0),
    journalEntryId: row.journalEntryId ? String(row.journalEntryId) : undefined,
    processedBy: String(row.processedBy || "system"),
    processedById: String(row.processedById || "system"),
    approvedBy: row.approvedBy ? String(row.approvedBy) : undefined,
    approvedById: row.approvedById ? String(row.approvedById) : undefined,
    approvedAt: row.approvedAt ? toIso(row.approvedAt) : undefined,
    payrollItems: [],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

const createPayrollSchema = z.object({
  payPeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payPeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET(request: NextRequest) {
  try {
    await ensureFinanceCoreTables()

    const { searchParams } = new URL(request.url)

    const filters: PayrollFilters = {
      department: searchParams.get("department") || undefined,
      employmentType: searchParams.get("employmentType") || undefined,
      status: searchParams.get("status") || undefined,
      payPeriodStart: searchParams.get("payPeriodStart") || undefined,
      payPeriodEnd: searchParams.get("payPeriodEnd") || undefined,
      search: searchParams.get("search") || undefined,
      page: Number.parseInt(searchParams.get("page") || "1", 10),
      limit: Number.parseInt(searchParams.get("limit") || "10", 10),
    }

    const where: string[] = ["1=1"]
    const params: unknown[] = []

    // Note: department/employmentType require HR subledger to calculate; ignored for now.

    if (filters.status) {
      where.push("status = ?")
      params.push(filters.status)
    }

    if (filters.payPeriodStart) {
      where.push("payPeriodStart >= ?")
      params.push(filters.payPeriodStart)
    }

    if (filters.payPeriodEnd) {
      where.push("payPeriodEnd <= ?")
      params.push(filters.payPeriodEnd)
    }

    if (filters.search) {
      where.push("payrollNumber LIKE ?")
      params.push(`%${filters.search}%`)
    }

    const page = Number.isFinite(filters.page) && (filters.page || 0) > 0 ? (filters.page as number) : 1
    const limit = Number.isFinite(filters.limit) && (filters.limit || 0) > 0 ? (filters.limit as number) : 10
    const offset = (page - 1) * limit

    const whereSql = `WHERE ${where.join(" AND ")}`

    const countRows = await dbQuery<RowDataPacket & { total: number }>(
      `SELECT COUNT(*) as total FROM finance_payroll_runs ${whereSql}`,
      params,
    )
    const total = Number(countRows?.[0]?.total ?? 0)

    const rows = await dbQuery<DbPayrollRow>(
      `SELECT * FROM finance_payroll_runs ${whereSql} ORDER BY payDate DESC, payrollNumber DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )

    const response: PayrollListResponse = {
      payrollRuns: (rows || []).map(mapPayroll),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching payroll runs:", error)
    return NextResponse.json({ error: "Failed to fetch payroll runs" }, { status: 500 })
  }
}

async function nextPayrollNumber(payDate: string): Promise<string> {
  const year = payDate.slice(0, 4)
  const month = payDate.slice(5, 7)
  const prefix = `PR-${year}-${month}-`

  const rows = await dbQuery<RowDataPacket & { c: number }>(
    "SELECT COUNT(*) as c FROM finance_payroll_runs WHERE payrollNumber LIKE ?",
    [`${prefix}%`],
  )
  const n = Number(rows?.[0]?.c ?? 0) + 1
  return `${prefix}${String(n).padStart(3, "0")}`
}

export async function POST(request: NextRequest) {
  try {
    await ensureFinanceCoreTables()

    const parsed = createPayrollSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payroll run", details: parsed.error.errors }, { status: 400 })
    }

    const id = crypto.randomUUID()
    const journalEntryId = crypto.randomUUID()
    const payrollNumber = await nextPayrollNumber(parsed.data.payDate)

    const pool = getDbPool()
    const conn = await pool.getConnection()

    try {
      await conn.beginTransaction()

      type IdRow = RowDataPacket & { id: string }
      type SeqRow = RowDataPacket & { seq: number }
      type HrAggRow = RowDataPacket & { c: number; s: string | number }

      const [cashRows] = await conn.execute<IdRow[]>(
        "SELECT id FROM gl_accounts WHERE accountCode = '1000' LIMIT 1",
        [],
      )
      const [expenseRows] = await conn.execute<IdRow[]>(
        "SELECT id FROM gl_accounts WHERE accountCode = '5000' LIMIT 1",
        [],
      )
      const cashAccountId = String(cashRows?.[0]?.id || "")
      const salariesExpenseAccountId = String(expenseRows?.[0]?.id || "")

      if (!cashAccountId || !salariesExpenseAccountId) {
        await conn.rollback()
        return NextResponse.json(
          {
            error: "Chart of Accounts is not initialized",
            message:
              "Run POST /api/finance/seed (FINANCE_SEED_KEY required) to create accounts 1000 (Cash) and 5000 (Salaries Expense).",
          },
          { status: 409 },
        )
      }

      let employeeCount = 0
      let totalGrossPay = 0
      try {
        const [hrRows] = await conn.execute<HrAggRow[]>(
          "SELECT COUNT(*) as c, COALESCE(SUM(salary), 0) as s FROM hr_employees WHERE status = 'active' AND salary IS NOT NULL",
          [],
        )
        employeeCount = Number(hrRows?.[0]?.c ?? 0)
        totalGrossPay = toNumber(hrRows?.[0]?.s ?? 0)
      } catch (e) {
        const code = (e as { code?: string })?.code
        if (code === "ER_NO_SUCH_TABLE") {
          await conn.rollback()
          return NextResponse.json(
            {
              error: "HR Employees table not found",
              message:
                "Expected table hr_employees with salary data. Run your DB setup script (academic-backend/setup-database.sql) or create hr_employees, then retry.",
            },
            { status: 409 },
          )
        }
        throw e
      }

      const totalDeductions = 0
      const totalNetPay = totalGrossPay

      const year = Number.parseInt(parsed.data.payDate.slice(0, 4), 10)
      await conn.execute("INSERT IGNORE INTO gl_journal_entry_sequences (seqYear, nextNumber) VALUES (?, 0)", [year])
      await conn.execute(
        "UPDATE gl_journal_entry_sequences SET nextNumber = LAST_INSERT_ID(nextNumber + 1) WHERE seqYear = ?",
        [year],
      )
      const [seqRows] = await conn.query<SeqRow[]>("SELECT LAST_INSERT_ID() as seq")
      const seq = Number(seqRows?.[0]?.seq ?? 0)
      const entryNumber = `JE-${year}-${String(seq).padStart(4, "0")}`

      await conn.execute(
        `INSERT INTO gl_journal_entries (
          id, entryNumber, entryDate, description, reference, entryType, status, totalDebit, totalCredit, createdBy, createdById
        ) VALUES (?, ?, ?, ?, ?, 'PAYROLL', 'POSTED', ?, ?, 'system', 'system')`,
        [
          journalEntryId,
          entryNumber,
          parsed.data.payDate,
          `Payroll run: ${payrollNumber}`,
          payrollNumber,
          totalNetPay,
          totalNetPay,
        ],
      )

      await conn.execute(
        `INSERT INTO gl_journal_lines (
          id, journalEntryId, accountId, description, debitAmount, creditAmount, lineNumber
        ) VALUES (?, ?, ?, ?, ?, 0, 1)`,
        [crypto.randomUUID(), journalEntryId, salariesExpenseAccountId, "Salaries expense", totalNetPay],
      )
      await conn.execute(
        `INSERT INTO gl_journal_lines (
          id, journalEntryId, accountId, description, debitAmount, creditAmount, lineNumber
        ) VALUES (?, ?, ?, ?, 0, ?, 2)`,
        [crypto.randomUUID(), journalEntryId, cashAccountId, "Cash payment", totalNetPay],
      )

      await conn.execute(
        `INSERT INTO finance_payroll_runs (
          id, payrollNumber, payPeriodStart, payPeriodEnd, payDate, status,
          totalGrossPay, totalDeductions, totalNetPay, employeeCount,
          journalEntryId, processedBy, processedById
        ) VALUES (?, ?, ?, ?, ?, 'PAID', ?, ?, ?, ?, ?, 'system', 'system')`,
        [
          id,
          payrollNumber,
          parsed.data.payPeriodStart,
          parsed.data.payPeriodEnd,
          parsed.data.payDate,
          totalGrossPay,
          totalDeductions,
          totalNetPay,
          employeeCount,
          journalEntryId,
        ],
      )

      await conn.commit()
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }

    const rows = await dbQuery<DbPayrollRow>("SELECT * FROM finance_payroll_runs WHERE id = ? LIMIT 1", [id])
    const payrollRun = rows?.[0] ? mapPayroll(rows[0]) : null

    return NextResponse.json({ success: true, payrollRun }, { status: 201 })
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "Payroll number already exists", message: "Retry creating the payroll run." },
        { status: 409 },
      )
    }
    console.error("Error creating payroll run:", error)
    return NextResponse.json({ error: "Failed to create payroll run" }, { status: 500 })
  }
}
