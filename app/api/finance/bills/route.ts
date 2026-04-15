import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { dbQuery, getDbPool } from "@/lib/db"
import { ensureFinanceCoreTables } from "../_db"
import type { Bill, BillFilters, BillListResponse, Vendor } from "@/types/finance"

export const runtime = "nodejs"

type DbBillRow = RowDataPacket & {
  id: string
  billNumber: string
  vendorName: string
  billDate: unknown
  dueDate: unknown
  description: string
  category: string
  status: string
  subtotal: string | number
  taxAmount: string | number
  totalAmount: string | number
  amountPaid: string | number
  amountDue: string | number
  reference: string | null
  journalEntryId: string | null
  createdBy: string
  createdById: string
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

function isOverdue(dueDate: string, status: string, amountDue: number): boolean {
  if (status === "PAID" || amountDue <= 0) return false
  const today = new Date().toISOString().slice(0, 10)
  return dueDate < today
}

function mapVendor(billId: string, vendorName: string, createdAt: string, updatedAt: string): Vendor {
  const vendorId = `vendor-${billId}`
  return {
    id: vendorId,
    vendorNumber: `VEN-${billId.slice(0, 8)}`,
    name: vendorName,
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    paymentTerms: "",
    accountPayableId: "",
    isActive: true,
    totalOwed: 0,
    creditLimit: undefined,
    createdAt,
    updatedAt,
  }
}

function mapBill(row: DbBillRow): Bill {
  const createdAt = toIso(row.createdAt)
  const updatedAt = toIso(row.updatedAt)

  const amountDue = toNumber(row.amountDue)
  const dueDate = toYmd(row.dueDate)

  const computedStatus = isOverdue(dueDate, String(row.status), amountDue) ? "OVERDUE" : String(row.status)

  return {
    id: String(row.id),
    billNumber: String(row.billNumber),
    vendorId: `vendor-${String(row.id)}`,
    vendor: mapVendor(String(row.id), String(row.vendorName), createdAt, updatedAt),
    billDate: toYmd(row.billDate),
    dueDate,
    description: String(row.description || ""),
    subtotal: toNumber(row.subtotal),
    taxAmount: toNumber(row.taxAmount),
    totalAmount: toNumber(row.totalAmount),
    amountPaid: toNumber(row.amountPaid),
    amountDue,
    status: computedStatus as Bill["status"],
    reference: row.reference ? String(row.reference) : undefined,
    journalEntryId: row.journalEntryId ? String(row.journalEntryId) : undefined,
    billItems: [],
    payments: [],
    createdBy: String(row.createdBy || "system"),
    createdById: String(row.createdById || "system"),
    createdAt,
    updatedAt,
  }
}

const createBillSchema = z.object({
  vendorName: z.string().min(1),
  billNumber: z.string().min(1),
  description: z.string().optional().default(""),
  amount: z.number().positive(),
  billDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().optional().default(""),
  status: z.enum(["DRAFT", "PENDING", "PAID", "OVERDUE", "CANCELLED"]).optional().default("PENDING"),
  reference: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    await ensureFinanceCoreTables()

    const { searchParams } = new URL(request.url)

    const filters: BillFilters = {
      status: searchParams.get("status") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      overdue: searchParams.get("overdue") === "true" ? true : undefined,
      search: searchParams.get("search") || undefined,
      page: Number.parseInt(searchParams.get("page") || "1", 10),
      limit: Number.parseInt(searchParams.get("limit") || "10", 10),
    }

    const where: string[] = ["1=1"]
    const params: unknown[] = []

    if (filters.status) {
      where.push("status = ?")
      params.push(filters.status)
    }

    if (filters.dateFrom) {
      where.push("billDate >= ?")
      params.push(filters.dateFrom)
    }

    if (filters.dateTo) {
      where.push("billDate <= ?")
      params.push(filters.dateTo)
    }

    if (filters.overdue) {
      where.push("dueDate < CURDATE()")
      where.push("amountDue > 0")
      where.push("status <> 'PAID'")
    }

    if (filters.search) {
      where.push("(billNumber LIKE ? OR vendorName LIKE ?)")
      params.push(`%${filters.search}%`, `%${filters.search}%`)
    }

    const page = Number.isFinite(filters.page) && (filters.page || 0) > 0 ? (filters.page as number) : 1
    const limit = Number.isFinite(filters.limit) && (filters.limit || 0) > 0 ? (filters.limit as number) : 10
    const offset = (page - 1) * limit

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const countRows = await dbQuery<RowDataPacket & { total: number }>(
      `SELECT COUNT(*) as total FROM finance_bills ${whereSql}`,
      params,
    )
    const total = Number(countRows?.[0]?.total ?? 0)

    const rows = await dbQuery<DbBillRow>(
      `SELECT * FROM finance_bills ${whereSql} ORDER BY dueDate DESC, billDate DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )

    const response: BillListResponse = {
      bills: (rows || []).map(mapBill),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching bills:", error)
    return NextResponse.json({ error: "Failed to fetch bills" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureFinanceCoreTables()

    const parsed = createBillSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid bill", details: parsed.error.errors }, { status: 400 })
    }

    const billDate = parsed.data.billDate || new Date().toISOString().slice(0, 10)
    const id = crypto.randomUUID()
    const journalEntryId = crypto.randomUUID()

    const amount = parsed.data.amount
    const subtotal = amount
    const taxAmount = 0
    const totalAmount = amount

    const category = String(parsed.data.category || "").toUpperCase()
    const expenseAccountCode = category.includes("SALARY") || category.includes("PAYROLL") ? "5000" : "5100"

    const pool = getDbPool()
    const conn = await pool.getConnection()

    try {
      await conn.beginTransaction()

      type IdRow = RowDataPacket & { id: string }
      type SeqRow = RowDataPacket & { seq: number }

      const [apRows] = await conn.execute<IdRow[]>(
        "SELECT id FROM gl_accounts WHERE accountCode = '2000' LIMIT 1",
        [],
      )
      const [expenseRows] = await conn.execute<IdRow[]>(
        "SELECT id FROM gl_accounts WHERE accountCode = ? LIMIT 1",
        [expenseAccountCode],
      )

      const apAccountId = String(apRows?.[0]?.id || "")
      const expenseAccountId = String(expenseRows?.[0]?.id || "")

      if (!apAccountId || !expenseAccountId) {
        await conn.rollback()
        return NextResponse.json(
          {
            error: "Chart of Accounts is not initialized",
            message:
              "Run POST /api/finance/seed (FINANCE_SEED_KEY required) to create accounts 2000 (Accounts Payable) and 5000/5100 (Expenses).",
          },
          { status: 409 },
        )
      }

      const year = Number.parseInt(billDate.slice(0, 4), 10)
      await conn.execute("INSERT IGNORE INTO gl_journal_entry_sequences (seqYear, nextNumber) VALUES (?, 0)", [year])
      await conn.execute(
        "UPDATE gl_journal_entry_sequences SET nextNumber = LAST_INSERT_ID(nextNumber + 1) WHERE seqYear = ?",
        [year],
      )
      const [seqRows] = await conn.query<SeqRow[]>("SELECT LAST_INSERT_ID() as seq")
      const seq = Number(seqRows?.[0]?.seq ?? 0)
      const entryNumber = `JE-${year}-${String(seq).padStart(4, "0")}`

      const reference = parsed.data.reference || parsed.data.billNumber

      await conn.execute(
        `INSERT INTO gl_journal_entries (
          id, entryNumber, entryDate, description, reference, entryType, status, totalDebit, totalCredit, createdBy, createdById
        ) VALUES (?, ?, ?, ?, ?, 'BILL', 'POSTED', ?, ?, 'system', 'system')`,
        [journalEntryId, entryNumber, billDate, `Bill: ${parsed.data.vendorName} (${parsed.data.billNumber})`, reference, totalAmount, totalAmount],
      )

      await conn.execute(
        `INSERT INTO gl_journal_lines (
          id, journalEntryId, accountId, description, debitAmount, creditAmount, lineNumber
        ) VALUES (?, ?, ?, ?, ?, 0, 1)`,
        [crypto.randomUUID(), journalEntryId, expenseAccountId, "Bill expense", totalAmount],
      )
      await conn.execute(
        `INSERT INTO gl_journal_lines (
          id, journalEntryId, accountId, description, debitAmount, creditAmount, lineNumber
        ) VALUES (?, ?, ?, ?, 0, ?, 2)`,
        [crypto.randomUUID(), journalEntryId, apAccountId, "Accounts payable", totalAmount],
      )

      const today = new Date().toISOString().slice(0, 10)
      const status = parsed.data.dueDate < today && parsed.data.status !== "PAID" ? "OVERDUE" : parsed.data.status

      await conn.execute(
        `INSERT INTO finance_bills (
          id, billNumber, vendorName, billDate, dueDate, description, category, status,
          subtotal, taxAmount, totalAmount, amountPaid, amountDue, reference, journalEntryId, createdBy, createdById
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'system', 'system')`,
        [
          id,
          parsed.data.billNumber,
          parsed.data.vendorName,
          billDate,
          parsed.data.dueDate,
          parsed.data.description || "",
          parsed.data.category || "",
          status,
          subtotal,
          taxAmount,
          totalAmount,
          totalAmount,
          reference || null,
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

    const rows = await dbQuery<DbBillRow>("SELECT * FROM finance_bills WHERE id = ? LIMIT 1", [id])
    const bill = rows?.[0] ? mapBill(rows[0]) : null

    return NextResponse.json({ success: true, bill }, { status: 201 })
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "Bill number already exists", message: "Choose a unique bill number and try again." },
        { status: 409 },
      )
    }
    console.error("Error creating bill:", error)
    return NextResponse.json({ error: "Failed to create bill" }, { status: 500 })
  }
}
