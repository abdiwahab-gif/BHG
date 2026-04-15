import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { dbQuery } from "@/lib/db"
import { AuditLogger } from "@/lib/audit-logger"
import { ensureIncomesTable, toIncomeDto, type DbIncomeRow } from "./_db"

export const runtime = "nodejs"

const createIncomeSchema = z.object({
  amount: z.preprocess(
    (v) => {
      if (typeof v === "number") return v
      if (typeof v === "string") return Number.parseFloat(v)
      return v
    },
    z.number().finite().positive(),
  ),
  donorName: z.string().trim().max(255).optional().default(""),
})

export async function GET(request: NextRequest) {
  try {
    await ensureIncomesTable()

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50
    const safePage = Number.isFinite(page) && page > 0 ? page : 1
    const offset = (safePage - 1) * safeLimit

    const countRows = await dbQuery<RowDataPacket & { total: number }>(
      "SELECT COUNT(*) as total FROM academic_module_incomes",
      [],
    )
    const total = Number(countRows?.[0]?.total || 0)
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, safeLimit)))
    const pageClamped = Math.min(Math.max(1, safePage), totalPages)
    const offsetClamped = (pageClamped - 1) * safeLimit

    const rows = await dbQuery<DbIncomeRow & RowDataPacket>(
      `SELECT id, amount, donorName, createdAt, updatedAt
       FROM academic_module_incomes
       ORDER BY createdAt DESC
       LIMIT ${offsetClamped}, ${safeLimit}`,
      [],
    )

    return NextResponse.json({
      success: true,
      incomes: (rows || []).map((r) => toIncomeDto(r as DbIncomeRow)),
      pagination: { page: pageClamped, limit: safeLimit, total, totalPages },
    })
  } catch (error) {
    console.error("Error fetching incomes:", error)
    return NextResponse.json({ error: "Failed to fetch incomes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureIncomesTable()

    const actorId = request.headers.get("x-user-id")
    const actorRole = request.headers.get("x-user-role") || ""
    const actorName = request.headers.get("x-user-name") || ""
    if (!actorId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const parsed = createIncomeSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid income", details: parsed.error.errors }, { status: 400 })
    }

    const id = crypto.randomUUID()
    await dbQuery(
      "INSERT INTO academic_module_incomes (id, amount, donorName) VALUES (?, ?, NULLIF(?, ''))",
      [id, parsed.data.amount, parsed.data.donorName],
    )

    const rows = await dbQuery<DbIncomeRow & RowDataPacket>(
      "SELECT id, amount, donorName, createdAt, updatedAt FROM academic_module_incomes WHERE id = ? LIMIT 1",
      [id],
    )

    const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"
    await AuditLogger.log({
      userId: actorId,
      userRole: String(actorRole),
      userName: String(actorName),
      action: "CREATE",
      entityType: "INCOME",
      entityId: id,
      newValues: rows?.[0] ? toIncomeDto(rows[0] as DbIncomeRow) : undefined,
      ipAddress: String(ipAddress),
      userAgent: String(userAgent),
    }).catch(() => undefined)

    return NextResponse.json({ success: true, income: rows[0] ? toIncomeDto(rows[0] as DbIncomeRow) : null })
  } catch (error) {
    console.error("Error creating income:", error)
    return NextResponse.json({ error: "Failed to create income" }, { status: 500 })
  }
}
