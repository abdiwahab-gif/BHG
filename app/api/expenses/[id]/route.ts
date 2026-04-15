import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { dbQuery } from "@/lib/db"
import { AuditLogger } from "@/lib/audit-logger"
import { ensureExpensesTable, toExpenseDto, type DbExpenseRow } from "../_db"

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

    const id = String(params.id || "").trim()
    if (!id) return NextResponse.json({ error: "Expense id is required" }, { status: 400 })

    const rows = await dbQuery<DbExpenseRow & RowDataPacket>(
      "SELECT id, amount, expenseType, createdAt, updatedAt FROM academic_module_expenses WHERE id = ? LIMIT 1",
      [id],
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

    const actorId = request.headers.get("x-user-id")
    const actorRole = request.headers.get("x-user-role") || ""
    const actorName = request.headers.get("x-user-name") || ""
    if (!actorId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const id = String(params.id || "").trim()
    if (!id) return NextResponse.json({ error: "Expense id is required" }, { status: 400 })

    const beforeRows = await dbQuery<DbExpenseRow & RowDataPacket>(
      "SELECT id, amount, expenseType, createdAt, updatedAt FROM academic_module_expenses WHERE id = ? LIMIT 1",
      [id],
    )
    if (!beforeRows?.[0]) return NextResponse.json({ error: "Expense not found" }, { status: 404 })

    const parsed = updateExpenseSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid expense", details: parsed.error.errors }, { status: 400 })
    }

    await dbQuery(
      "UPDATE academic_module_expenses SET amount = ?, expenseType = ? WHERE id = ?",
      [parsed.data.amount, parsed.data.expenseType, id],
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

    const actorId = request.headers.get("x-user-id")
    const actorRole = request.headers.get("x-user-role") || ""
    const actorName = request.headers.get("x-user-name") || ""
    if (!actorId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const id = String(params.id || "").trim()
    if (!id) return NextResponse.json({ error: "Expense id is required" }, { status: 400 })

    const beforeRows = await dbQuery<DbExpenseRow & RowDataPacket>(
      "SELECT id, amount, expenseType, createdAt, updatedAt FROM academic_module_expenses WHERE id = ? LIMIT 1",
      [id],
    )
    if (!beforeRows?.[0]) return NextResponse.json({ error: "Expense not found" }, { status: 404 })

    await dbQuery("DELETE FROM academic_module_expenses WHERE id = ?", [id])

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
