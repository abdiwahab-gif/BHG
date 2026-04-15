import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { dbQuery, getDbPool } from "@/lib/db"
import { AuditLogger } from "@/lib/audit-logger"
import { ensureFinanceCoreTables } from "../../../_db"
import { FinanceStudentsTableResolutionError, resolveFinanceStudentsTable } from "../../../_students"

type MysqlErrorLike = {
  code?: string
  errno?: number
  sqlState?: string
  message?: string
}

function toYmd(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, "0")
    const day = String(value.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  if (typeof value === "string") return value.length >= 10 ? value.slice(0, 10) : value
  return new Date().toISOString().slice(0, 10)
}

async function getActiveAcademicYear(): Promise<string> {
  try {
    const rows = await dbQuery<RowDataPacket & { name: string }>(
      "SELECT name FROM sessions WHERE isActive = TRUE ORDER BY startDate DESC LIMIT 1",
      [],
    )
    const name = typeof rows?.[0]?.name === "string" ? rows[0].name.trim() : ""
    if (name) return name
  } catch {
    // ignore
  }
  const now = new Date()
  const year = now.getFullYear()
  return `${year}-${year + 1}`
}

async function getActiveSemester(): Promise<string> {
  try {
    const sessionRows = await dbQuery<RowDataPacket & { id: string }>(
      "SELECT id FROM sessions WHERE isActive = TRUE ORDER BY startDate DESC LIMIT 1",
      [],
    )
    const sessionId = typeof sessionRows?.[0]?.id === "string" ? sessionRows[0].id : ""
    if (!sessionId) return ""

    const semRows = await dbQuery<RowDataPacket & { name: string }>(
      "SELECT name FROM academic_module_semesters WHERE sessionId = ? ORDER BY startDate DESC LIMIT 1",
      [sessionId],
    )
    return typeof semRows?.[0]?.name === "string" ? semRows[0].name.trim() : ""
  } catch {
    return ""
  }
}

const paymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(["CASH", "CHECK", "BANK_TRANSFER", "CREDIT_CARD", "MOBILE_MONEY", "ONLINE"]),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reference: z.string().optional(),
  bankReference: z.string().optional(),
  sessionId: z.string().optional(),
  semesterId: z.string().optional(),
})

type DbAccountRow = RowDataPacket & { id: string }

type DbStudentRow = RowDataPacket & {
  id: string
  firstName: string
  lastName: string
  studentNumber: string
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureFinanceCoreTables()

    const actorId = request.headers.get("x-user-id") || "system"
    const actorRole = request.headers.get("x-user-role") || "system"
    const actorName = request.headers.get("x-user-name") || actorId

    let studentsTable: Awaited<ReturnType<typeof resolveFinanceStudentsTable>>
    try {
      studentsTable = await resolveFinanceStudentsTable()
    } catch (e) {
      if (e instanceof FinanceStudentsTableResolutionError) {
        return NextResponse.json({ error: "Student table resolution failed", message: e.message }, { status: e.status })
      }
      throw e
    }

    const studentUuid = String(params?.id || "").trim()
    if (!studentUuid) {
      return NextResponse.json({ error: "Student id is required" }, { status: 400 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = paymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment", details: parsed.error.errors }, { status: 400 })
    }

    const { amount, paymentMethod } = parsed.data
    const paymentDate = parsed.data.paymentDate || new Date().toISOString().slice(0, 10)
    const reference = parsed.data.reference || `PAY-${Date.now()}`
    const bankReference = parsed.data.bankReference

    const requestedSessionId = typeof parsed.data.sessionId === "string" ? parsed.data.sessionId.trim() : ""
    const requestedSemesterId = typeof parsed.data.semesterId === "string" ? parsed.data.semesterId.trim() : ""

    const studentRows =
      studentsTable === "students"
        ? await dbQuery<DbStudentRow>(
            "SELECT s.id as id, COALESCE(u.name, '') as firstName, '' as lastName, s.studentId as studentNumber FROM students s LEFT JOIN users u ON u.id = s.userId WHERE s.id = ? LIMIT 1",
            [studentUuid],
          )
        : await dbQuery<DbStudentRow>(
            "SELECT id, firstName, lastName, studentId as studentNumber FROM academic_module_students WHERE id = ? LIMIT 1",
            [studentUuid],
          )
    if (!studentRows.length) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // COA mapping (seeded): 1000 Cash, 4000 Tuition & Fees Revenue
    const cashRows = await dbQuery<DbAccountRow>("SELECT id FROM gl_accounts WHERE accountCode = '1000' LIMIT 1", [])
    const revenueRows = await dbQuery<DbAccountRow>("SELECT id FROM gl_accounts WHERE accountCode = '4000' LIMIT 1", [])

    const cashAccountId = cashRows?.[0]?.id ? String(cashRows[0].id) : ""
    const revenueAccountId = revenueRows?.[0]?.id ? String(revenueRows[0].id) : ""

    if (!cashAccountId || !revenueAccountId) {
      return NextResponse.json(
        {
          error: "Chart of Accounts is not initialized",
          message: "Run POST /api/finance/seed (FINANCE_SEED_KEY required) to create accounts 1000 and 4000.",
        },
        { status: 409 },
      )
    }

    let academicYear = await getActiveAcademicYear()
    let semester = await getActiveSemester()

    if (requestedSessionId) {
      try {
        const sessionRows = await dbQuery<RowDataPacket & { name: string }>(
          "SELECT name FROM sessions WHERE id = ? LIMIT 1",
          [requestedSessionId],
        )
        const sessionName = typeof sessionRows?.[0]?.name === "string" ? sessionRows[0].name.trim() : ""
        if (sessionName) academicYear = sessionName
      } catch {
        // ignore and fall back to active
      }
    }

    if (requestedSessionId) {
      try {
        if (requestedSemesterId) {
          const semRows = await dbQuery<RowDataPacket & { name: string }>(
            "SELECT name FROM academic_module_semesters WHERE id = ? AND sessionId = ? LIMIT 1",
            [requestedSemesterId, requestedSessionId],
          )
          const semName = typeof semRows?.[0]?.name === "string" ? semRows[0].name.trim() : ""
          if (semName) semester = semName
        } else {
          const semRows = await dbQuery<RowDataPacket & { name: string }>(
            "SELECT name FROM academic_module_semesters WHERE sessionId = ? ORDER BY startDate DESC LIMIT 1",
            [requestedSessionId],
          )
          const semName = typeof semRows?.[0]?.name === "string" ? semRows[0].name.trim() : ""
          if (semName) semester = semName
        }
      } catch {
        // ignore and fall back to active
      }
    }

    const pool = getDbPool()
    const conn = await pool.getConnection()

    const receiptNumber = `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
    const txId = randomUUID()
    const journalEntryId = randomUUID()

    try {
      await conn.beginTransaction()

      // 1) Insert student subledger transaction
      await conn.execute(
        `INSERT INTO finance_student_transactions (
          id, studentId, transactionType, amount, description, reference, paymentMethod, receiptNumber, bankReference,
          journalEntryId, processedBy, processedById, academicYear, semester, transactionDate
        ) VALUES (?, ?, 'PAYMENT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          txId,
          studentUuid,
          amount,
          `Student payment received (${paymentMethod})`,
          reference,
          paymentMethod,
          receiptNumber,
          bankReference || null,
          journalEntryId,
          actorName,
          actorId,
          academicYear,
          semester,
          paymentDate,
        ],
      )

      // 2) Post a GL journal entry (cash-basis): Dr Cash, Cr Tuition Revenue
      const year = Number.parseInt(paymentDate.slice(0, 4), 10)

      await conn.execute("INSERT IGNORE INTO gl_journal_entry_sequences (seqYear, nextNumber) VALUES (?, 0)", [year])
      await conn.execute(
        "UPDATE gl_journal_entry_sequences SET nextNumber = LAST_INSERT_ID(nextNumber + 1) WHERE seqYear = ?",
        [year],
      )
      type SeqRow = RowDataPacket & { seq: number }
      const [seqRows] = await conn.query<SeqRow[]>("SELECT LAST_INSERT_ID() as seq")
      const seq = Number(seqRows?.[0]?.seq ?? 0)
      const entryNumber = `JE-${year}-${String(seq).padStart(4, "0")}`

      const student = studentRows[0]
      const studentLabel = `${String(student.firstName)} ${String(student.lastName)}`.trim()

      await conn.execute(
        `INSERT INTO gl_journal_entries (
          id, entryNumber, entryDate, description, reference, entryType, status, totalDebit, totalCredit, createdBy, createdById
        ) VALUES (?, ?, ?, ?, ?, 'PAYMENT', 'POSTED', ?, ?, ?, ?)`,
        [
          journalEntryId,
          entryNumber,
          paymentDate,
          `Student payment: ${studentLabel}`,
          receiptNumber,
          amount,
          amount,
          actorName,
          actorId,
        ],
      )

      const cashLineId = randomUUID()
      const revenueLineId = randomUUID()

      await conn.execute(
        `INSERT INTO gl_journal_lines (
          id, journalEntryId, accountId, description, debitAmount, creditAmount, lineNumber
        ) VALUES (?, ?, ?, ?, ?, 0, 1)`,
        [cashLineId, journalEntryId, cashAccountId, "Cash receipt", amount],
      )

      await conn.execute(
        `INSERT INTO gl_journal_lines (
          id, journalEntryId, accountId, description, debitAmount, creditAmount, lineNumber
        ) VALUES (?, ?, ?, ?, 0, ?, 2)`,
        [revenueLineId, journalEntryId, revenueAccountId, "Tuition & fees revenue", amount],
      )

      await conn.commit()
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }

    try {
      await AuditLogger.log({
        userId: actorId,
        userRole: actorRole,
        userName: actorName,
        action: "CREATE",
        entityType: "FINANCE_PAYMENT",
        entityId: txId,
        oldValues: undefined,
        newValues: {
          studentId: studentUuid,
          amount,
          paymentMethod,
          paymentDate: toYmd(paymentDate),
          reference,
          receiptNumber,
          bankReference: bankReference || null,
          academicYear,
          semester,
          journalEntryId,
        },
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      })
    } catch (e) {
      console.error("Failed to audit finance payment create", e)
    }

    return NextResponse.json(
      {
        success: true,
        message: "Payment recorded successfully",
        studentId: studentUuid,
        transactionId: txId,
        receiptNumber,
        journalEntryId,
        academicYear,
        semester,
        payment: {
          amount,
          paymentMethod,
          paymentDate: toYmd(paymentDate),
          reference,
          bankReference: bankReference || null,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    const errorId = randomUUID()
    console.error("Error recording student payment:", { errorId, error })

    const e = (typeof error === "object" && error ? (error as MysqlErrorLike) : {})
    return NextResponse.json(
      {
        error: "Failed to record payment",
        errorId,
        code: typeof e.code === "string" ? e.code : undefined,
        errno: typeof e.errno === "number" ? e.errno : undefined,
        sqlState: typeof e.sqlState === "string" ? e.sqlState : undefined,
        message: typeof e.message === "string" ? e.message : undefined,
      },
      { status: 500 },
    )
  }
}
