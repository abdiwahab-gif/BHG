import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { dbQuery, getDbPool } from "@/lib/db"
import { ensureFinanceCoreTables } from "../_db"
import type { AccountFilters, AccountListResponse, ChartOfAccounts } from "@/types/finance"

type DbAccountRow = RowDataPacket & {
  id: string
  accountCode: string
  accountName: string
  accountType: string
  accountSubType: string
  parentAccountId: string | null
  isActive: number | boolean
  balance: string | number | null
  description: string | null
  taxLineMapping: string | null
  createdAt: any
  updatedAt: any
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number.parseFloat(value)
  return Number(value || 0)
}

function normalizeIso(value: any): string {
  if (!value) return new Date(0).toISOString()
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

function isAccountType(value: unknown): value is ChartOfAccounts["accountType"] {
  return value === "ASSET" || value === "LIABILITY" || value === "EQUITY" || value === "REVENUE" || value === "EXPENSE"
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

export async function GET(request: NextRequest) {
  try {
    try {
      await ensureFinanceCoreTables()
    } catch (e) {
      ;(e as any).financeStep = "coa.ensureFinanceCoreTables"
      throw e
    }

    const { searchParams } = new URL(request.url)

    const filters: AccountFilters = {
      accountType: searchParams.get("accountType") || undefined,
      accountSubType: searchParams.get("accountSubType") || undefined,
      isActive:
        searchParams.get("isActive") === "true"
          ? true
          : searchParams.get("isActive") === "false"
            ? false
            : undefined,
      search: searchParams.get("search") || undefined,
      page: Number.parseInt(searchParams.get("page") || "1"),
      limit: Number.parseInt(searchParams.get("limit") || "50"),
    }

    const where: string[] = []
    const params: unknown[] = []

    if (filters.accountType) {
      where.push("a.accountType = ?")
      params.push(filters.accountType)
    }
    if (filters.accountSubType) {
      where.push("a.accountSubType = ?")
      params.push(filters.accountSubType)
    }
    if (filters.isActive !== undefined) {
      where.push("a.isActive = ?")
      params.push(filters.isActive ? 1 : 0)
    }
    if (filters.search) {
      where.push("(a.accountCode LIKE ? OR a.accountName LIKE ? OR a.description LIKE ?)")
      const like = `%${filters.search}%`
      params.push(like, like, like)
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""
    const page = Number.isFinite(filters.page) && (filters.page || 0) > 0 ? (filters.page as number) : 1
    const limit = Number.isFinite(filters.limit) && (filters.limit || 0) > 0 ? (filters.limit as number) : 50
    const offset = (page - 1) * limit

    let countRows: Array<RowDataPacket & { total: string | number }> = []
    try {
      countRows = await dbQuery<RowDataPacket & { total: string | number }>(
        `SELECT COUNT(*) as total FROM gl_accounts a ${whereSql}`,
        params,
      )
    } catch (e) {
      ;(e as any).financeStep = "coa.count"
      throw e
    }
    const total = Number(countRows?.[0]?.total ?? 0)

    let rows: DbAccountRow[] = []
    try {
      const pool = getDbPool()
      const [result] = await pool.query(
        `SELECT
        a.id,
        a.accountCode,
        a.accountName,
        a.accountType,
        a.accountSubType,
        a.parentAccountId,
        a.isActive,
        a.description,
        a.taxLineMapping,
        a.createdAt,
        a.updatedAt,
        COALESCE(
          SUM(CASE WHEN e.status = 'POSTED' THEN l.debitAmount ELSE 0 END) -
          SUM(CASE WHEN e.status = 'POSTED' THEN l.creditAmount ELSE 0 END),
          0
        ) AS balance
      FROM gl_accounts a
      LEFT JOIN gl_journal_lines l ON l.accountId = a.id
      LEFT JOIN gl_journal_entries e ON e.id = l.journalEntryId
      ${whereSql}
      GROUP BY a.id, a.accountCode, a.accountName, a.accountType, a.accountSubType, a.parentAccountId, a.isActive, a.description, a.taxLineMapping, a.createdAt, a.updatedAt
      ORDER BY a.accountCode ASC
      LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      )
      rows = result as DbAccountRow[]
    } catch (e) {
      ;(e as any).financeStep = "coa.list"
      throw e
    }

    const accounts: ChartOfAccounts[] = (rows || []).map((r) => ({
      id: String(r.id),
      accountCode: String(r.accountCode),
      accountName: String(r.accountName),
      accountType: (r.accountType as any) || "ASSET",
      accountSubType: String(r.accountSubType || ""),
      parentAccountId: r.parentAccountId ? String(r.parentAccountId) : undefined,
      isActive: Boolean(r.isActive),
      balance: toNumber(r.balance),
      description: r.description ? String(r.description) : undefined,
      taxLineMapping: r.taxLineMapping ? String(r.taxLineMapping) : undefined,
      createdAt: normalizeIso(r.createdAt),
      updatedAt: normalizeIso(r.updatedAt),
    }))

    const response: AccountListResponse = {
      accounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching chart of accounts:", error)
    return NextResponse.json({ error: "Failed to fetch chart of accounts", ...maybeDebugDetails(request, error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureFinanceCoreTables()

    const accountData = await request.json()
    const accountCode = typeof accountData?.accountCode === "string" ? accountData.accountCode.trim() : ""
    const accountName = typeof accountData?.accountName === "string" ? accountData.accountName.trim() : ""
    const accountType = accountData?.accountType
    const accountSubType = typeof accountData?.accountSubType === "string" ? accountData.accountSubType.trim() : ""
    const description = typeof accountData?.description === "string" ? accountData.description.trim() : ""
    const parentAccountId = typeof accountData?.parentAccountId === "string" ? accountData.parentAccountId.trim() : ""
    const taxLineMapping = typeof accountData?.taxLineMapping === "string" ? accountData.taxLineMapping.trim() : ""

    if (!accountCode || !accountName) {
      return NextResponse.json({ error: "Account code and name are required" }, { status: 400 })
    }
    if (!isAccountType(accountType)) {
      return NextResponse.json({ error: "Invalid account type" }, { status: 400 })
    }

    const existing = await dbQuery<RowDataPacket & { id: string }>(
      "SELECT id FROM gl_accounts WHERE accountCode = ? LIMIT 1",
      [accountCode],
    )
    if (existing.length) {
      return NextResponse.json({ error: "Account code already exists" }, { status: 409 })
    }

    if (parentAccountId) {
      const parent = await dbQuery<RowDataPacket & { id: string }>(
        "SELECT id FROM gl_accounts WHERE id = ? LIMIT 1",
        [parentAccountId],
      )
      if (!parent.length) {
        return NextResponse.json({ error: "Parent account not found" }, { status: 400 })
      }
    }

    const id = crypto.randomUUID()
    await dbQuery(
      `INSERT INTO gl_accounts (
        id, accountCode, accountName, accountType, accountSubType, parentAccountId, description, taxLineMapping, isActive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        id,
        accountCode,
        accountName,
        accountType,
        accountSubType,
        parentAccountId || null,
        description || null,
        taxLineMapping || null,
      ],
    )

    const createdRows = await dbQuery<DbAccountRow>(
      `SELECT
        a.id,
        a.accountCode,
        a.accountName,
        a.accountType,
        a.accountSubType,
        a.parentAccountId,
        a.isActive,
        a.description,
        a.taxLineMapping,
        a.createdAt,
        a.updatedAt,
        0 as balance
      FROM gl_accounts a
      WHERE a.id = ?
      LIMIT 1`,
      [id],
    )

    const row = createdRows[0]
    const newAccount: ChartOfAccounts = {
      id: String(row.id),
      accountCode: String(row.accountCode),
      accountName: String(row.accountName),
      accountType: row.accountType as any,
      accountSubType: String(row.accountSubType || ""),
      parentAccountId: row.parentAccountId ? String(row.parentAccountId) : undefined,
      isActive: Boolean(row.isActive),
      balance: 0,
      description: row.description ? String(row.description) : undefined,
      taxLineMapping: row.taxLineMapping ? String(row.taxLineMapping) : undefined,
      createdAt: normalizeIso(row.createdAt),
      updatedAt: normalizeIso(row.updatedAt),
    }

    return NextResponse.json(newAccount, { status: 201 })
  } catch (error) {
    console.error("Error creating account:", error)
    return NextResponse.json({ error: "Failed to create account", ...maybeDebugDetails(request, error) }, { status: 500 })
  }
}
