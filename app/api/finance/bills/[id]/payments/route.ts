import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { getDbPool } from "@/lib/db"
import { ensureFinanceCoreTables } from "../../../_db"

export const runtime = "nodejs"

const paymentSchema = z.object({
  billId: z.string().optional(),
  amount: z.number().positive(),
  paymentMethod: z.enum(["CASH", "CHECK", "BANK_TRANSFER", "CREDIT_CARD", "ACH"]),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reference: z.string().optional(),
  totalAmount: z.number().optional(),
})

type DbBillRow = RowDataPacket & {
  id: string
  billNumber: string
  vendorName: string
  dueDate: unknown
  status: string
  totalAmount: string | number
  amountPaid: string | number
  amountDue: string | number
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number.parseFloat(value)
  return Number(value || 0)
}

function toYmd(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  const s = String(value || "")
  return s.length >= 10 ? s.slice(0, 10) : s
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureFinanceCoreTables()

    const billId = String(params?.id || "").trim()
    if (!billId) return NextResponse.json({ error: "Bill id is required" }, { status: 400 })

    const parsed = paymentSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment", details: parsed.error.errors }, { status: 400 })
    }

    const { amount, paymentMethod, paymentDate } = parsed.data
    const reference = parsed.data.reference || `PAY-${Date.now()}`

    const pool = getDbPool()
    const conn = await pool.getConnection()

    const paymentId = crypto.randomUUID()
    const journalEntryId = crypto.randomUUID()

    try {
      await conn.beginTransaction()

      const [billRows] = await conn.execute<DbBillRow[]>(
        "SELECT id, billNumber, vendorName, dueDate, status, totalAmount, amountPaid, amountDue FROM finance_bills WHERE id = ? LIMIT 1 FOR UPDATE",
        [billId],
      )
      const bill = billRows?.[0]
      if (!bill) {
        await conn.rollback()
        return NextResponse.json({ error: "Bill not found" }, { status: 404 })
      }

      type IdRow = RowDataPacket & { id: string }
      type SeqRow = RowDataPacket & { seq: number }

      const [cashRows] = await conn.execute<IdRow[]>(
        "SELECT id FROM gl_accounts WHERE accountCode = '1000' LIMIT 1",
        [],
      )
      const [apRows] = await conn.execute<IdRow[]>("SELECT id FROM gl_accounts WHERE accountCode = '2000' LIMIT 1", [])

      const cashAccountId = String(cashRows?.[0]?.id || "")
      const apAccountId = String(apRows?.[0]?.id || "")

      if (!cashAccountId || !apAccountId) {
        await conn.rollback()
        return NextResponse.json(
          {
            error: "Chart of Accounts is not initialized",
            message:
              "Run POST /api/finance/seed (FINANCE_SEED_KEY required) to create accounts 1000 (Cash) and 2000 (Accounts Payable).",
          },
          { status: 409 },
        )
      }

      const currentPaid = toNumber(bill.amountPaid)
      const currentDue = toNumber(bill.amountDue)

      if (amount > currentDue + 0.0001) {
        await conn.rollback()
        return NextResponse.json({ error: "Payment amount exceeds amount due" }, { status: 400 })
      }

      const year = Number.parseInt(paymentDate.slice(0, 4), 10)
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
        ) VALUES (?, ?, ?, ?, ?, 'BILL_PAYMENT', 'POSTED', ?, ?, 'system', 'system')`,
        [
          journalEntryId,
          entryNumber,
          paymentDate,
          `Bill payment: ${String(bill.vendorName)} (${String(bill.billNumber)})`,
          reference,
          amount,
          amount,
        ],
      )

      await conn.execute(
        `INSERT INTO gl_journal_lines (
          id, journalEntryId, accountId, description, debitAmount, creditAmount, lineNumber
        ) VALUES (?, ?, ?, ?, ?, 0, 1)`,
        [crypto.randomUUID(), journalEntryId, apAccountId, "Reduce accounts payable", amount],
      )
      await conn.execute(
        `INSERT INTO gl_journal_lines (
          id, journalEntryId, accountId, description, debitAmount, creditAmount, lineNumber
        ) VALUES (?, ?, ?, ?, 0, ?, 2)`,
        [crypto.randomUUID(), journalEntryId, cashAccountId, "Cash payment", amount],
      )

      await conn.execute(
        `INSERT INTO finance_bill_payments (
          id, billId, paymentDate, amount, paymentMethod, reference, journalEntryId, createdBy, createdById
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'system', 'system')`,
        [paymentId, billId, paymentDate, amount, paymentMethod, reference, journalEntryId],
      )

      const newPaid = currentPaid + amount
      const newDue = Math.max(0, currentDue - amount)

      const dueDate = toYmd(bill.dueDate)
      const today = new Date().toISOString().slice(0, 10)
      const nextStatus = newDue <= 0 ? "PAID" : dueDate < today ? "OVERDUE" : "PENDING"

      await conn.execute(
        "UPDATE finance_bills SET amountPaid = ?, amountDue = ?, status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
        [newPaid, newDue, nextStatus, billId],
      )

      await conn.commit()

      return NextResponse.json(
        {
          success: true,
          payment: {
            id: paymentId,
            billId,
            paymentDate,
            amount,
            paymentMethod,
            reference,
          },
          updatedBill: {
            id: billId,
            amountPaid: newPaid,
            amountDue: newDue,
            status: nextStatus,
            updatedAt: new Date().toISOString(),
          },
          message: "Payment processed successfully",
        },
        { status: 201 },
      )
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error("Error processing bill payment:", error)
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 })
  }
}