import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { RowDataPacket } from "mysql2/promise"
import { dbQuery, getDbPool } from "@/lib/db"
import { ensureFinanceCoreTables } from "../_db"
import type { ChartOfAccounts, JournalEntry, JournalEntryFilters, JournalEntryListResponse } from "@/types/finance"

type DbJournalEntryRow = RowDataPacket & {
  id: string
  entryNumber: string
  entryDate: any
  description: string
  reference: string | null
  totalDebit: string | number
  totalCredit: string | number
  entryType: string
  status: string
  createdBy: string
  createdById: string
  approvedBy: string | null
  approvedById: string | null
  approvedAt: any
  createdAt: any
  updatedAt: any
}

type DbJournalLineRow = RowDataPacket & {
  id: string
  journalEntryId: string
  accountId: string
  description: string
  debitAmount: string | number
  creditAmount: string | number
  lineNumber: number

  acc_id: string
  acc_accountCode: string
  acc_accountName: string
  acc_accountType: string
  acc_accountSubType: string
  acc_parentAccountId: string | null
  acc_isActive: number | boolean
  acc_description: string | null
  acc_taxLineMapping: string | null
  acc_createdAt: any
  acc_updatedAt: any
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number.parseFloat(value)
  return Number(value || 0)
}

function toYmd(value: any): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, "0")
    const day = String(value.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  if (typeof value === "string") {
    return value.length >= 10 ? value.slice(0, 10) : value
  }

  return String(value ?? "")
}

function normalizeIso(value: any): string {
  if (!value) return new Date(0).toISOString()
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

function maybeDebugDetails(request: NextRequest, error: unknown): Record<string, unknown> {
  const debug = request.nextUrl.searchParams.get("debug") === "1"
  const debugEnabled = process.env.FINANCE_DEBUG === "1"
  if (!debug || !debugEnabled) return {}

  const err = error as any
  const message = typeof err?.message === "string" ? err.message : String(error)
  const code = typeof err?.code === "string" ? err.code : undefined
  const errno = typeof err?.errno === "number" ? err.errno : undefined
  const sqlState = typeof err?.sqlState === "string" ? err.sqlState : undefined
  const financeStep = typeof err?.financeStep === "string" ? err.financeStep : null
  const vercelGitCommitSha = process.env.VERCEL_GIT_COMMIT_SHA || null

  return {
    details: {
      vercelGitCommitSha,
      financeStep,
      code,
      errno,
      sqlState,
      message,
    },
  }
}

const entryTypeEnum = z.enum(["GENERAL", "ADJUSTING", "CLOSING", "STUDENT_FEE", "PAYROLL", "BILL", "PAYMENT"])

const lineItemSchema = z
  .object({
    accountId: z.string().min(1),
    description: z.string().min(1),
    debitAmount: z.number().nonnegative().default(0),
    creditAmount: z.number().nonnegative().default(0),
  })
  .superRefine((val, ctx) => {
    const debit = Number(val.debitAmount || 0)
    const credit = Number(val.creditAmount || 0)

    if (debit > 0 && credit > 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Line item cannot have both debit and credit", path: ["debitAmount"] })
    }
    if (debit === 0 && credit === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Line item must have a debit or credit amount", path: ["debitAmount"] })
    }
  })

const createEntrySchema = z
  .object({
    entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    description: z.string().min(1),
    reference: z.string().optional(),
    entryType: entryTypeEnum.optional().default("GENERAL"),
    lineItems: z.array(lineItemSchema).min(2),
  })
  .superRefine((val, ctx) => {
    const totalDebits = val.lineItems.reduce((sum, li) => sum + Number(li.debitAmount || 0), 0)
    const totalCredits = val.lineItems.reduce((sum, li) => sum + Number(li.creditAmount || 0), 0)

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Journal entry must be balanced (total debits = total credits)",
        path: ["lineItems"],
      })
    }
  })

async function fetchEntriesWithLines(entryIds: string[]): Promise<JournalEntry[]> {
  if (!entryIds.length) return []

  const placeholders = entryIds.map(() => "?").join(",")

  const entries = await dbQuery<DbJournalEntryRow>(
    `SELECT
      id,
      entryNumber,
      entryDate,
      description,
      reference,
      totalDebit,
      totalCredit,
      entryType,
      status,
      createdBy,
      createdById,
      approvedBy,
      approvedById,
      approvedAt,
      createdAt,
      updatedAt
    FROM gl_journal_entries
    WHERE id IN (${placeholders})`,
    entryIds,
  )

  const lines = await dbQuery<DbJournalLineRow>(
    `SELECT
      l.id,
      l.journalEntryId,
      l.accountId,
      l.description,
      l.debitAmount,
      l.creditAmount,
      l.lineNumber,
      a.id as acc_id,
      a.accountCode as acc_accountCode,
      a.accountName as acc_accountName,
      a.accountType as acc_accountType,
      a.accountSubType as acc_accountSubType,
      a.parentAccountId as acc_parentAccountId,
      a.isActive as acc_isActive,
      a.description as acc_description,
      a.taxLineMapping as acc_taxLineMapping,
      a.createdAt as acc_createdAt,
      a.updatedAt as acc_updatedAt
    FROM gl_journal_lines l
    JOIN gl_accounts a ON a.id = l.accountId
    WHERE l.journalEntryId IN (${placeholders})
    ORDER BY l.journalEntryId ASC, l.lineNumber ASC`,
    entryIds,
  )

  const linesByEntry = new Map<string, JournalEntry["lineItems"]>()
  for (const row of lines || []) {
    const account: ChartOfAccounts = {
      id: String(row.acc_id),
      accountCode: String(row.acc_accountCode),
      accountName: String(row.acc_accountName),
      accountType: row.acc_accountType as any,
      accountSubType: String(row.acc_accountSubType || ""),
      parentAccountId: row.acc_parentAccountId ? String(row.acc_parentAccountId) : undefined,
      isActive: Boolean(row.acc_isActive),
      balance: 0,
      description: row.acc_description ? String(row.acc_description) : undefined,
      taxLineMapping: row.acc_taxLineMapping ? String(row.acc_taxLineMapping) : undefined,
      createdAt: normalizeIso(row.acc_createdAt),
      updatedAt: normalizeIso(row.acc_updatedAt),
    }

    const item = {
      id: String(row.id),
      journalEntryId: String(row.journalEntryId),
      accountId: String(row.accountId),
      account,
      description: String(row.description || ""),
      debitAmount: toNumber(row.debitAmount),
      creditAmount: toNumber(row.creditAmount),
      lineNumber: Number(row.lineNumber || 0),
    }

    const list = linesByEntry.get(item.journalEntryId) || []
    list.push(item)
    linesByEntry.set(item.journalEntryId, list)
  }

  const mapEntry = (e: DbJournalEntryRow): JournalEntry => ({
    id: String(e.id),
    entryNumber: String(e.entryNumber),
    entryDate: toYmd(e.entryDate),
    description: String(e.description),
    reference: e.reference ? String(e.reference) : undefined,
    totalDebit: toNumber(e.totalDebit),
    totalCredit: toNumber(e.totalCredit),
    entryType: e.entryType as any,
    status: e.status as any,
    lineItems: linesByEntry.get(String(e.id)) || [],
    createdBy: String(e.createdBy || "system"),
    createdById: String(e.createdById || "system"),
    approvedBy: e.approvedBy ? String(e.approvedBy) : undefined,
    approvedById: e.approvedById ? String(e.approvedById) : undefined,
    approvedAt: e.approvedAt ? normalizeIso(e.approvedAt) : undefined,
    createdAt: normalizeIso(e.createdAt),
    updatedAt: normalizeIso(e.updatedAt),
  })

  // Preserve ordering by entryIds
  const byId = new Map(entries.map((e) => [String(e.id), e]))
  return entryIds
    .map((id) => {
      const entry = byId.get(id)
      return entry ? mapEntry(entry) : null
    })
    .filter((e): e is JournalEntry => Boolean(e))
}

export async function GET(request: NextRequest) {
  try {
    try {
      await ensureFinanceCoreTables()
    } catch (e) {
      ;(e as any).financeStep = "journal.ensureFinanceCoreTables"
      throw e
    }

    const { searchParams } = new URL(request.url)

    const filters: JournalEntryFilters = {
      entryType: searchParams.get("entryType") || undefined,
      accountId: searchParams.get("accountId") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
      page: Number.parseInt(searchParams.get("page") || "1"),
      limit: Number.parseInt(searchParams.get("limit") || "10"),
    }

    const where: string[] = []
    const params: unknown[] = []

    if (filters.entryType) {
      where.push("e.entryType = ?")
      params.push(filters.entryType)
    }
    if (filters.status) {
      where.push("e.status = ?")
      params.push(filters.status)
    }
    if (filters.dateFrom) {
      where.push("e.entryDate >= ?")
      params.push(filters.dateFrom)
    }
    if (filters.dateTo) {
      where.push("e.entryDate <= ?")
      params.push(filters.dateTo)
    }
    if (filters.search) {
      where.push("(e.entryNumber LIKE ? OR e.description LIKE ? OR e.reference LIKE ?)")
      const like = `%${filters.search}%`
      params.push(like, like, like)
    }
    if (filters.accountId) {
      where.push("EXISTS (SELECT 1 FROM gl_journal_lines l WHERE l.journalEntryId = e.id AND l.accountId = ?)")
      params.push(filters.accountId)
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""
    const page = Number.isFinite(filters.page) && (filters.page || 0) > 0 ? (filters.page as number) : 1
    const limit = Number.isFinite(filters.limit) && (filters.limit || 0) > 0 ? (filters.limit as number) : 10
    const offset = (page - 1) * limit

    let countRows: Array<RowDataPacket & { total: string | number }> = []
    try {
      countRows = await dbQuery<RowDataPacket & { total: string | number }>(
        `SELECT COUNT(*) as total FROM gl_journal_entries e ${whereSql}`,
        params,
      )
    } catch (e) {
      ;(e as any).financeStep = "journal.count"
      throw e
    }
    const total = Number(countRows?.[0]?.total ?? 0)

    let entryIdRows: Array<RowDataPacket & { id: string }> = []
    try {
      const pool = getDbPool()
      const [result] = await pool.query(
        `SELECT e.id
       FROM gl_journal_entries e
       ${whereSql}
       ORDER BY e.entryDate DESC, e.createdAt DESC
       LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      )
      entryIdRows = result as Array<RowDataPacket & { id: string }>
    } catch (e) {
      ;(e as any).financeStep = "journal.listIds"
      throw e
    }

    const entryIds = (entryIdRows || []).map((r) => String((r as any).id)).filter(Boolean)
    const journalEntries = await fetchEntriesWithLines(entryIds)

    const response: JournalEntryListResponse = {
      journalEntries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching journal entries:", error)
    return NextResponse.json({ error: "Failed to fetch journal entries", ...maybeDebugDetails(request, error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureFinanceCoreTables()

    const rawBody = await request.json()
    const body = createEntrySchema.parse(rawBody)

    const createdById = request.headers.get("x-user-id") || "system"
    const createdBy = request.headers.get("x-user-name") || "system"

    // Validate accounts exist
    const accountIds = Array.from(new Set(body.lineItems.map((li) => li.accountId)))
    if (!accountIds.length) {
      return NextResponse.json({ error: "No accounts provided" }, { status: 400 })
    }

    const placeholders = accountIds.map(() => "?").join(",")
    const accountRows = await dbQuery<RowDataPacket & { id: string; isActive: number | boolean }>(
      `SELECT id, isActive FROM gl_accounts WHERE id IN (${placeholders})`,
      accountIds,
    )

    const foundIds = new Set((accountRows || []).map((r) => String((r as any).id)))
    const missing = accountIds.filter((id) => !foundIds.has(id))
    if (missing.length) {
      return NextResponse.json({ error: `Unknown account(s): ${missing.join(", ")}` }, { status: 400 })
    }

    const inactive = (accountRows || []).filter((r) => !Boolean((r as any).isActive)).map((r) => String((r as any).id))
    if (inactive.length) {
      return NextResponse.json({ error: "One or more accounts are inactive" }, { status: 400 })
    }

    const totalDebit = body.lineItems.reduce((sum, li) => sum + Number(li.debitAmount || 0), 0)
    const totalCredit = body.lineItems.reduce((sum, li) => sum + Number(li.creditAmount || 0), 0)

    const entryDate = body.entryDate
    const year = Number.parseInt(entryDate.slice(0, 4), 10)

    const pool = getDbPool()
    const conn = await pool.getConnection()

    let entryId = ""

    try {
      await conn.beginTransaction()

      // Atomic JE-YYYY-#### numbering
      await conn.execute("INSERT IGNORE INTO gl_journal_entry_sequences (seqYear, nextNumber) VALUES (?, 0)", [year])
      await conn.execute(
        "UPDATE gl_journal_entry_sequences SET nextNumber = LAST_INSERT_ID(nextNumber + 1) WHERE seqYear = ?",
        [year],
      )
      const [seqRows] = await conn.query<RowDataPacket[]>("SELECT LAST_INSERT_ID() as seq")
      const seq = Number((seqRows as any)?.[0]?.seq ?? 0)
      const entryNumber = `JE-${year}-${String(seq).padStart(4, "0")}`

      entryId = crypto.randomUUID()

      await conn.execute(
        `INSERT INTO gl_journal_entries (
          id, entryNumber, entryDate, description, reference, entryType, status, totalDebit, totalCredit, createdBy, createdById
        ) VALUES (?, ?, ?, ?, ?, ?, 'POSTED', ?, ?, ?, ?)`,
        [
          entryId,
          entryNumber,
          entryDate,
          body.description,
          body.reference || null,
          body.entryType,
          totalDebit,
          totalCredit,
          createdBy,
          createdById,
        ],
      )

      for (let i = 0; i < body.lineItems.length; i++) {
        const li = body.lineItems[i]
        const lineId = crypto.randomUUID()
        const lineNumber = i + 1
        await conn.execute(
          `INSERT INTO gl_journal_lines (
            id, journalEntryId, accountId, description, debitAmount, creditAmount, lineNumber
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [lineId, entryId, li.accountId, li.description, li.debitAmount || 0, li.creditAmount || 0, lineNumber],
        )
      }

      await conn.commit()
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }

    const entries = await fetchEntriesWithLines([entryId])
    return NextResponse.json(entries[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid journal entry", details: error.errors }, { status: 400 })
    }

    console.error("Error creating journal entry:", error)
    return NextResponse.json({ error: "Failed to create journal entry", ...maybeDebugDetails(request, error) }, { status: 500 })
  }
}
