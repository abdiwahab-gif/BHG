import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { dbQuery } from "@/lib/db"
import { AuditLogger } from "@/lib/audit-logger"
import { ensureExpensesTable, toExpenseDto, type DbExpenseRow } from "../_db"
import { requireAuth } from "@/lib/server-auth"

export const runtime = "nodejs"

const updateExpenseSchema = z.object({
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

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureExpensesTable()

    const auth = requireAuth(_request)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

    const id = String(params.id || "").trim()
    if (!id) return NextResponse.json({ error: "Expense id is required" }, { status: 400 })

    const rows = await dbQuery<DbExpenseRow & RowDataPacket>(
      auth.isAdmin
        ? "SELECT id, createdById, amount, expenseType, createdAt, updatedAt FROM academic_module_expenses WHERE id = ? LIMIT 1"
        : "SELECT id, createdById, amount, expenseType, createdAt, updatedAt FROM academic_module_expenses WHERE id = ? AND createdById = ? LIMIT 1",
      auth.isAdmin ? [id] : [id, auth.userId],
    )
    if (!rows?.[0]) return NextResponse.json({ error: "Expense not found" }, { status: 404 })

    return NextResponse.json({ success: true, expense: toExpenseDto(rows[0] as DbExpenseRow) })
  } catch (error) {
    console.error("Error fetching expense:", error)
    return NextResponse.json({ error: "Failed to fetch expense" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureExpensesTable()

    const auth = requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
    const actorId = auth.userId
    const actorRole = auth.role
    const actorName = request.headers.get("x-user-name") || auth.email || ""

    const id = String(params.id || "").trim()
    if (!id) return NextResponse.json({ error: "Expense id is required" }, { status: 400 })

    const beforeRows = await dbQuery<DbExpenseRow & RowDataPacket>(
      auth.isAdmin
        ? "SELECT id, createdById, amount, expenseType, createdAt, updatedAt FROM academic_module_expenses WHERE id = ? LIMIT 1"
        : "SELECT id, createdById, amount, expenseType, createdAt, updatedAt FROM academic_module_expenses WHERE id = ? AND createdById = ? LIMIT 1",
      auth.isAdmin ? [id] : [id, auth.userId],
    )
    if (!beforeRows?.[0]) return NextResponse.json({ error: "Expense not found" }, { status: 404 })

    const parsed = updateExpenseSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid expense", details: parsed.error.errors }, { status: 400 })
    }

    if (auth.isAdmin) {
      await dbQuery(
        "UPDATE academic_module_expenses SET amount = ?, expenseType = ? WHERE id = ?",
        [parsed.data.amount, parsed.data.expenseType, id],
      )
    } else {
      await dbQuery(
        "UPDATE academic_module_expenses SET amount = ?, expenseType = ? WHERE id = ? AND createdById = ?",
        [parsed.data.amount, parsed.data.expenseType, id, auth.userId],
      )
    }

    const rows = await dbQuery<DbExpenseRow & RowDataPacket>(
      auth.isAdmin
        ? "SELECT id, createdById, amount, expenseType, createdAt, updatedAt FROM academic_module_expenses WHERE id = ? LIMIT 1"
        : "SELECT id, createdById, amount, expenseType, createdAt, updatedAt FROM academic_module_expenses WHERE id = ? AND createdById = ? LIMIT 1",
      auth.isAdmin ? [id] : [id, auth.userId],
    )

    const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"
    await AuditLogger.log({
      userId: actorId,
      userRole: String(actorRole),
      userName: String(actorName),
      action: "UPDATE",
      entityType: "EXPENSE",
      entityId: id,
      oldValues: toExpenseDto(beforeRows[0] as DbExpenseRow),
      newValues: rows?.[0] ? toExpenseDto(rows[0] as DbExpenseRow) : undefined,
      ipAddress: String(ipAddress),
      userAgent: String(userAgent),
    }).catch(() => undefined)

    return NextResponse.json({ success: true, expense: rows[0] ? toExpenseDto(rows[0] as DbExpenseRow) : null })
  } catch (error) {
    console.error("Error updating expense:", error)
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureExpensesTable()

    const auth = requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
    const actorId = auth.userId
    const actorRole = auth.role
    const actorName = request.headers.get("x-user-name") || auth.email || ""

    const id = String(params.id || "").trim()
    if (!id) return NextResponse.json({ error: "Expense id is required" }, { status: 400 })

    const beforeRows = await dbQuery<DbExpenseRow & RowDataPacket>(
      auth.isAdmin
        ? "SELECT id, createdById, amount, expenseType, createdAt, updatedAt FROM academic_module_expenses WHERE id = ? LIMIT 1"
        : "SELECT id, createdById, amount, expenseType, createdAt, updatedAt FROM academic_module_expenses WHERE id = ? AND createdById = ? LIMIT 1",
      auth.isAdmin ? [id] : [id, auth.userId],
    )
    if (!beforeRows?.[0]) return NextResponse.json({ error: "Expense not found" }, { status: 404 })

    if (auth.isAdmin) {
      await dbQuery("DELETE FROM academic_module_expenses WHERE id = ?", [id])
    } else {
      await dbQuery("DELETE FROM academic_module_expenses WHERE id = ? AND createdById = ?", [id, auth.userId])
    }

    const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"
    await AuditLogger.log({
      userId: actorId,
      userRole: String(actorRole),
      userName: String(actorName),
      action: "DELETE",
      entityType: "EXPENSE",
      entityId: id,
      oldValues: toExpenseDto(beforeRows[0] as DbExpenseRow),
      ipAddress: String(ipAddress),
      userAgent: String(userAgent),
    }).catch(() => undefined)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting expense:", error)
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 })
  }
}
