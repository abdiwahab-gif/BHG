import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"

import { dbQuery } from "@/lib/db"
import { AuditLogger } from "@/lib/audit-logger"
import { ensureFinanceCoreTables } from "../../_db"
import { FinanceStudentsTableResolutionError, resolveFinanceStudentsTable } from "../../_students"

type DbStudentTxRow = RowDataPacket & {
  id: string
  studentId: string
  transactionType: string
  amount: string | number
  description: string
  reference: string | null
  paymentMethod: string | null
  receiptNumber: string | null
  bankReference: string | null
  journalEntryId: string | null
  processedBy: string
  processedById: string
  academicYear: string
  semester: string
  transactionDate: unknown
  createdAt: unknown
  updatedAt: unknown
}

type DbStudentRow = RowDataPacket & {
  id: string
  firstName: string
  lastName: string
  studentNumber: string
}

function toYmd(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, "0")
    const day = String(value.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  if (typeof value === "string") return value.length >= 10 ? value.slice(0, 10) : value
  return String(value ?? "")
}

const updateSchema = z
  .object({
    description: z.string().min(1).max(2000).optional(),
    reference: z.string().max(100).optional(),
    paymentMethod: z
      .enum(["CASH", "CHECK", "BANK_TRANSFER", "CREDIT_CARD", "MOBILE_MONEY", "ONLINE"])
      .optional(),
    receiptNumber: z.string().max(50).optional(),
    bankReference: z.string().max(100).optional(),
    academicYear: z.string().max(20).optional(),
    semester: z.string().max(50).optional(),
    transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict()

async function getTxById(id: string): Promise<DbStudentTxRow | null> {
  const rows = await dbQuery<DbStudentTxRow>(
    `SELECT
      id, studentId, transactionType, amount, description, reference, paymentMethod, receiptNumber, bankReference,
      journalEntryId, processedBy, processedById, academicYear, semester, transactionDate, createdAt, updatedAt
    FROM finance_student_transactions
    WHERE id = ?
    LIMIT 1`,
    [id],
  )
  return rows?.[0] ? rows[0] : null
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureFinanceCoreTables()

    const txId = String(params?.id || "").trim()
    if (!txId) {
      return NextResponse.json({ success: false, error: "Transaction id is required" }, { status: 400 })
    }

    const tx = await getTxById(txId)
    if (!tx) {
      return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 })
    }

    let studentsTable: Awaited<ReturnType<typeof resolveFinanceStudentsTable>>
    try {
      studentsTable = await resolveFinanceStudentsTable()
    } catch (e) {
      if (e instanceof FinanceStudentsTableResolutionError) {
        return NextResponse.json({ success: false, error: "Student table resolution failed", message: e.message }, { status: e.status })
      }
      throw e
    }

    let student: DbStudentRow | null = null
    if (studentsTable === "students") {
      const rows = await dbQuery<DbStudentRow>(
        "SELECT s.id as id, COALESCE(u.name, '') as firstName, '' as lastName, s.studentId as studentNumber FROM students s LEFT JOIN users u ON u.id = s.userId WHERE s.id = ? LIMIT 1",
        [String(tx.studentId)],
      )
      student = rows?.[0] ? rows[0] : null
    } else {
      const rows = await dbQuery<DbStudentRow>(
        "SELECT id, firstName, lastName, studentId as studentNumber FROM academic_module_students WHERE id = ? LIMIT 1",
        [String(tx.studentId)],
      )
      student = rows?.[0] ? rows[0] : null
    }

    return NextResponse.json({
      success: true,
      data: {
        id: String(tx.id),
        studentId: String(tx.studentId),
        transactionType: String(tx.transactionType),
        amount: Number(tx.amount),
        description: String(tx.description),
        reference: tx.reference ? String(tx.reference) : "",
        paymentMethod: tx.paymentMethod ? String(tx.paymentMethod) : "",
        receiptNumber: tx.receiptNumber ? String(tx.receiptNumber) : "",
        bankReference: tx.bankReference ? String(tx.bankReference) : "",
        journalEntryId: tx.journalEntryId ? String(tx.journalEntryId) : "",
        processedBy: String(tx.processedBy),
        processedById: String(tx.processedById),
        academicYear: String(tx.academicYear || ""),
        semester: String(tx.semester || ""),
        transactionDate: toYmd(tx.transactionDate),
        createdAt: toYmd(tx.createdAt),
        updatedAt: toYmd(tx.updatedAt),
        student: student
          ? {
              id: String(student.id),
              name: `${String(student.firstName)} ${String(student.lastName)}`.trim(),
              studentNumber: String(student.studentNumber || ""),
            }
          : null,
      },
    })
  } catch (error) {
    console.error("[GET /api/finance/student-transactions/:id]", error)
    const message = error instanceof Error ? error.message : "Failed to fetch payment"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureFinanceCoreTables()

    const actorId = request.headers.get("x-user-id") || "system"
    const actorRole = request.headers.get("x-user-role") || "system"
    const actorName = request.headers.get("x-user-name") || actorId

    const txId = String(params?.id || "").trim()
    if (!txId) {
      return NextResponse.json({ success: false, error: "Transaction id is required" }, { status: 400 })
    }

    const existing = await getTxById(txId)
    if (!existing) {
      return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 })
    }

    if (String(existing.transactionType).toUpperCase() !== "PAYMENT") {
      return NextResponse.json({ success: false, error: "Only PAYMENT transactions can be edited" }, { status: 409 })
    }

    const body = await request.json().catch(() => null)
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid update", details: parsed.error.errors }, { status: 400 })
    }

    const patch = parsed.data

    const nextDescription = patch.description ?? String(existing.description)
    const nextReference = patch.reference ?? (existing.reference ? String(existing.reference) : "")
    const nextPaymentMethod = patch.paymentMethod ?? (existing.paymentMethod ? String(existing.paymentMethod) : "")
    const nextReceiptNumber = patch.receiptNumber ?? (existing.receiptNumber ? String(existing.receiptNumber) : "")
    const nextBankReference = patch.bankReference ?? (existing.bankReference ? String(existing.bankReference) : "")
    const nextAcademicYear = patch.academicYear ?? String(existing.academicYear || "")
    const nextSemester = patch.semester ?? String(existing.semester || "")
    const nextTransactionDate = patch.transactionDate ?? toYmd(existing.transactionDate)

    await dbQuery(
      `UPDATE finance_student_transactions
       SET description = ?, reference = NULLIF(?, ''), paymentMethod = NULLIF(?, ''),
           receiptNumber = NULLIF(?, ''), bankReference = NULLIF(?, ''),
           academicYear = ?, semester = ?, transactionDate = ?
       WHERE id = ?`,
      [
        nextDescription,
        nextReference,
        nextPaymentMethod,
        nextReceiptNumber,
        nextBankReference,
        nextAcademicYear,
        nextSemester,
        nextTransactionDate,
        txId,
      ],
    )

    const updated = await getTxById(txId)

    try {
      await AuditLogger.log({
        userId: actorId,
        userRole: actorRole,
        userName: actorName,
        action: "UPDATE",
        entityType: "FINANCE_PAYMENT",
        entityId: txId,
        oldValues: {
          description: String(existing.description),
          reference: existing.reference,
          paymentMethod: existing.paymentMethod,
          receiptNumber: existing.receiptNumber,
          bankReference: existing.bankReference,
          academicYear: existing.academicYear,
          semester: existing.semester,
          transactionDate: toYmd(existing.transactionDate),
        },
        newValues: {
          description: nextDescription,
          reference: nextReference,
          paymentMethod: nextPaymentMethod,
          receiptNumber: nextReceiptNumber,
          bankReference: nextBankReference,
          academicYear: nextAcademicYear,
          semester: nextSemester,
          transactionDate: nextTransactionDate,
        },
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      })
    } catch (e) {
      console.error("Failed to audit finance payment update", e)
    }

    return NextResponse.json(
      {
        success: true,
        message: "Payment updated",
        data: updated
          ? {
              id: String(updated.id),
              studentId: String(updated.studentId),
              amount: Number(updated.amount),
              description: String(updated.description),
              reference: updated.reference ? String(updated.reference) : "",
              paymentMethod: updated.paymentMethod ? String(updated.paymentMethod) : "",
              receiptNumber: updated.receiptNumber ? String(updated.receiptNumber) : "",
              bankReference: updated.bankReference ? String(updated.bankReference) : "",
              academicYear: String(updated.academicYear || ""),
              semester: String(updated.semester || ""),
              transactionDate: toYmd(updated.transactionDate),
              updatedAt: toYmd(updated.updatedAt),
            }
          : null,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[PUT /api/finance/student-transactions/:id]", error)
    const message = error instanceof Error ? error.message : "Failed to update payment"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
