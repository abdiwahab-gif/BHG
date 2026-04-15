import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { dbQuery } from "@/lib/db"
import { AuditLogger } from "@/lib/audit-logger"
import { ensureExpensesTable, toExpenseDto, type DbExpenseRow } from "./_db"
import { requireAuth } from "@/lib/server-auth"

export const runtime = "nodejs"

const createExpenseSchema = z.object({
  amount: z.preprocess(
    (v) => {
      if (typeof v === "number") return v
      if (typeof v === "string") return Number.parseFloat(v)
      return v
    },
    z.number().finite().positive(),
  ),
  expenseType: z.string().trim().min(2).max(255),
})

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

    await ensureExpensesTable()

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50
    const safePage = Number.isFinite(page) && page > 0 ? page : 1
    const offset = (safePage - 1) * safeLimit

    const whereSql = auth.isAdmin ? "" : "WHERE createdById = ?"
    const whereParams: unknown[] = auth.isAdmin ? [] : [auth.userId]

    const countRows = await dbQuery<RowDataPacket & { total: number }>(
      `SELECT COUNT(*) as total FROM academic_module_expenses ${whereSql}`,
      whereParams,
    )
    const total = Number(countRows?.[0]?.total || 0)
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, safeLimit)))
    const pageClamped = Math.min(Math.max(1, safePage), totalPages)
    const offsetClamped = (pageClamped - 1) * safeLimit

    const rows = await dbQuery<DbExpenseRow & RowDataPacket>(
      `SELECT id, amount, expenseType, createdAt, updatedAt
       FROM academic_module_expenses
       ${whereSql}
       ORDER BY createdAt DESC
       LIMIT ${offsetClamped}, ${safeLimit}`,
      whereParams,
    )

    return NextResponse.json({
      success: true,
      expenses: (rows || []).map((r) => toExpenseDto(r as DbExpenseRow)),
      pagination: { page: pageClamped, limit: safeLimit, total, totalPages },
    })
  } catch (error) {
    console.error("Error fetching expenses:", error)
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

    await ensureExpensesTable()

    const actorId = auth.userId
    const actorRole = auth.role
    const actorName = request.headers.get("x-user-name") || auth.email || ""

    const parsed = createExpenseSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid expense", details: parsed.error.errors }, { status: 400 })
    }

    const id = crypto.randomUUID()
    await dbQuery(
      "INSERT INTO academic_module_expenses (id, createdById, amount, expenseType) VALUES (?, ?, ?, ?)",
      [id, auth.userId, parsed.data.amount, parsed.data.expenseType],
    )

    const rows = await dbQuery<DbExpenseRow & RowDataPacket>(
      "SELECT id, amount, expenseType, createdAt, updatedAt FROM academic_module_expenses WHERE id = ? LIMIT 1",
      [id],
    )

    const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"
    await AuditLogger.log({
      userId: actorId,
      userRole: String(actorRole),
      userName: String(actorName),
      action: "CREATE",
      entityType: "EXPENSE",
      entityId: id,
      newValues: rows?.[0] ? toExpenseDto(rows[0] as DbExpenseRow) : undefined,
      ipAddress: String(ipAddress),
      userAgent: String(userAgent),
    }).catch(() => undefined)

    return NextResponse.json({ success: true, expense: rows[0] ? toExpenseDto(rows[0] as DbExpenseRow) : null })
  } catch (error) {
    console.error("Error creating expense:", error)
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 })
  }
}
