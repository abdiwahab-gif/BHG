import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { dbQuery } from "@/lib/db"
import { AuditLogger } from "@/lib/audit-logger"
import { ensureIncomesTable, toIncomeDto, type DbIncomeRow } from "../_db"
import { requireAuth } from "@/lib/server-auth"

export const runtime = "nodejs"

const updateIncomeSchema = z.object({
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

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureIncomesTable()

    const auth = requireAuth(_request)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

    const id = String(params.id || "").trim()
    if (!id) return NextResponse.json({ error: "Income id is required" }, { status: 400 })

    const rows = await dbQuery<DbIncomeRow & RowDataPacket>(
      auth.isAdmin
        ? "SELECT id, createdById, amount, donorName, createdAt, updatedAt FROM academic_module_incomes WHERE id = ? LIMIT 1"
        : "SELECT id, createdById, amount, donorName, createdAt, updatedAt FROM academic_module_incomes WHERE id = ? AND createdById = ? LIMIT 1",
      auth.isAdmin ? [id] : [id, auth.userId],
    )
    if (!rows?.[0]) return NextResponse.json({ error: "Income not found" }, { status: 404 })

    return NextResponse.json({ success: true, income: toIncomeDto(rows[0] as DbIncomeRow) })
  } catch (error) {
    console.error("Error fetching income:", error)
    return NextResponse.json({ error: "Failed to fetch income" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureIncomesTable()

    const auth = requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
    const actorId = auth.userId
    const actorRole = auth.role
    const actorName = request.headers.get("x-user-name") || auth.email || ""

    const id = String(params.id || "").trim()
    if (!id) return NextResponse.json({ error: "Income id is required" }, { status: 400 })

    const beforeRows = await dbQuery<DbIncomeRow & RowDataPacket>(
      auth.isAdmin
        ? "SELECT id, createdById, amount, donorName, createdAt, updatedAt FROM academic_module_incomes WHERE id = ? LIMIT 1"
        : "SELECT id, createdById, amount, donorName, createdAt, updatedAt FROM academic_module_incomes WHERE id = ? AND createdById = ? LIMIT 1",
      auth.isAdmin ? [id] : [id, auth.userId],
    )
    if (!beforeRows?.[0]) return NextResponse.json({ error: "Income not found" }, { status: 404 })

    const parsed = updateIncomeSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid income", details: parsed.error.errors }, { status: 400 })
    }

    if (auth.isAdmin) {
      await dbQuery(
        "UPDATE academic_module_incomes SET amount = ?, donorName = NULLIF(?, '') WHERE id = ?",
        [parsed.data.amount, parsed.data.donorName, id],
      )
    } else {
      await dbQuery(
        "UPDATE academic_module_incomes SET amount = ?, donorName = NULLIF(?, '') WHERE id = ? AND createdById = ?",
        [parsed.data.amount, parsed.data.donorName, id, auth.userId],
      )
    }

    const rows = await dbQuery<DbIncomeRow & RowDataPacket>(
      auth.isAdmin
        ? "SELECT id, createdById, amount, donorName, createdAt, updatedAt FROM academic_module_incomes WHERE id = ? LIMIT 1"
        : "SELECT id, createdById, amount, donorName, createdAt, updatedAt FROM academic_module_incomes WHERE id = ? AND createdById = ? LIMIT 1",
      auth.isAdmin ? [id] : [id, auth.userId],
    )

    const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"
    await AuditLogger.log({
      userId: actorId,
      userRole: String(actorRole),
      userName: String(actorName),
      action: "UPDATE",
      entityType: "INCOME",
      entityId: id,
      oldValues: toIncomeDto(beforeRows[0] as DbIncomeRow),
      newValues: rows?.[0] ? toIncomeDto(rows[0] as DbIncomeRow) : undefined,
      ipAddress: String(ipAddress),
      userAgent: String(userAgent),
    }).catch(() => undefined)

    return NextResponse.json({ success: true, income: rows[0] ? toIncomeDto(rows[0] as DbIncomeRow) : null })
  } catch (error) {
    console.error("Error updating income:", error)
    return NextResponse.json({ error: "Failed to update income" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureIncomesTable()

    const auth = requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
    const actorId = auth.userId
    const actorRole = auth.role
    const actorName = request.headers.get("x-user-name") || auth.email || ""

    const id = String(params.id || "").trim()
    if (!id) return NextResponse.json({ error: "Income id is required" }, { status: 400 })

    const beforeRows = await dbQuery<DbIncomeRow & RowDataPacket>(
      auth.isAdmin
        ? "SELECT id, createdById, amount, donorName, createdAt, updatedAt FROM academic_module_incomes WHERE id = ? LIMIT 1"
        : "SELECT id, createdById, amount, donorName, createdAt, updatedAt FROM academic_module_incomes WHERE id = ? AND createdById = ? LIMIT 1",
      auth.isAdmin ? [id] : [id, auth.userId],
    )
    if (!beforeRows?.[0]) return NextResponse.json({ error: "Income not found" }, { status: 404 })

    if (auth.isAdmin) {
      await dbQuery("DELETE FROM academic_module_incomes WHERE id = ?", [id])
    } else {
      await dbQuery("DELETE FROM academic_module_incomes WHERE id = ? AND createdById = ?", [id, auth.userId])
    }

    const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"
    await AuditLogger.log({
      userId: actorId,
      userRole: String(actorRole),
      userName: String(actorName),
      action: "DELETE",
      entityType: "INCOME",
      entityId: id,
      oldValues: toIncomeDto(beforeRows[0] as DbIncomeRow),
      ipAddress: String(ipAddress),
      userAgent: String(userAgent),
    }).catch(() => undefined)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting income:", error)
    return NextResponse.json({ error: "Failed to delete income" }, { status: 500 })
  }
}
