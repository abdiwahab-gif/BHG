import { NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { dbQuery } from "@/lib/db"
import { ensureFinanceCoreTables } from "../_db"
import { FinanceStudentsTableResolutionError, resolveFinanceStudentsTable } from "../_students"
import type { FinancialDashboardStats } from "@/types/finance"

function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number.parseFloat(value)
  return Number(value || 0)
}

function monthLabel(monthIndex1to12: number): string {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return labels[Math.min(Math.max(monthIndex1to12, 1), 12) - 1] || ""
}

export async function GET() {
  try {
    await ensureFinanceCoreTables()

    let studentsTable: Awaited<ReturnType<typeof resolveFinanceStudentsTable>>
    try {
      studentsTable = await resolveFinanceStudentsTable()
    } catch (e) {
      if (e instanceof FinanceStudentsTableResolutionError) {
        return NextResponse.json({ error: "Student table resolution failed", message: e.message }, { status: e.status })
      }
      throw e
    }

    // Totals across all posted entries.
    const revenueRows = await dbQuery<RowDataPacket & { amount: string | number }>(
      `SELECT
        COALESCE(SUM(l.creditAmount - l.debitAmount), 0) as amount
      FROM gl_journal_lines l
      JOIN gl_journal_entries e ON e.id = l.journalEntryId
      JOIN gl_accounts a ON a.id = l.accountId
      WHERE e.status = 'POSTED' AND a.accountType = 'REVENUE'`,
      [],
    )
    const totalRevenue = Math.max(0, toNumber(revenueRows?.[0]?.amount))

    const expenseRows = await dbQuery<RowDataPacket & { amount: string | number }>(
      `SELECT
        COALESCE(SUM(l.debitAmount - l.creditAmount), 0) as amount
      FROM gl_journal_lines l
      JOIN gl_journal_entries e ON e.id = l.journalEntryId
      JOIN gl_accounts a ON a.id = l.accountId
      WHERE e.status = 'POSTED' AND a.accountType = 'EXPENSE'`,
      [],
    )
    const totalExpenses = Math.max(0, toNumber(expenseRows?.[0]?.amount))

    const netIncome = totalRevenue - totalExpenses

    // Seeded codes: 1000 Cash, 1100 Accounts Receivable, 2000 Accounts Payable
    const cashRows = await dbQuery<RowDataPacket & { amount: string | number }>(
      `SELECT
        COALESCE(SUM(l.debitAmount - l.creditAmount), 0) as amount
      FROM gl_journal_lines l
      JOIN gl_journal_entries e ON e.id = l.journalEntryId
      JOIN gl_accounts a ON a.id = l.accountId
      WHERE e.status = 'POSTED' AND a.accountCode = '1000'`,
      [],
    )
    const cashBalance = toNumber(cashRows?.[0]?.amount)

    const arRows = await dbQuery<RowDataPacket & { amount: string | number }>(
      `SELECT
        COALESCE(SUM(l.debitAmount - l.creditAmount), 0) as amount
      FROM gl_journal_lines l
      JOIN gl_journal_entries e ON e.id = l.journalEntryId
      JOIN gl_accounts a ON a.id = l.accountId
      WHERE e.status = 'POSTED' AND a.accountCode = '1100'`,
      [],
    )
    const accountsReceivable = toNumber(arRows?.[0]?.amount)

    const apRows = await dbQuery<RowDataPacket & { amount: string | number }>(
      `SELECT
        COALESCE(SUM(l.creditAmount - l.debitAmount), 0) as amount
      FROM gl_journal_lines l
      JOIN gl_journal_entries e ON e.id = l.journalEntryId
      JOIN gl_accounts a ON a.id = l.accountId
      WHERE e.status = 'POSTED' AND a.accountCode = '2000'`,
      [],
    )
    const accountsPayable = toNumber(apRows?.[0]?.amount)

    // 12-month revenue trend.
    const trendRows = await dbQuery<RowDataPacket & { ym: string; amount: string | number }>(
      `SELECT
        DATE_FORMAT(e.entryDate, '%Y-%m') as ym,
        COALESCE(SUM(l.creditAmount - l.debitAmount), 0) as amount
      FROM gl_journal_lines l
      JOIN gl_journal_entries e ON e.id = l.journalEntryId
      JOIN gl_accounts a ON a.id = l.accountId
      WHERE e.status = 'POSTED' AND a.accountType = 'REVENUE'
        AND e.entryDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(e.entryDate, '%Y-%m')
      ORDER BY ym ASC`,
      [],
    )

    const monthlyRevenueTrend = (trendRows || []).map((r) => {
      const ym = String((r as any).ym || "")
      const month = ym ? Number.parseInt(ym.split("-")[1] || "0", 10) : 0
      return { month: monthLabel(month), amount: Math.max(0, toNumber((r as any).amount)) }
    })

    // Expense breakdown by account.
    const expenseByAccountRows = await dbQuery<RowDataPacket & { accountName: string; amount: string | number }>(
      `SELECT
        a.accountName as accountName,
        COALESCE(SUM(l.debitAmount - l.creditAmount), 0) as amount
      FROM gl_journal_lines l
      JOIN gl_journal_entries e ON e.id = l.journalEntryId
      JOIN gl_accounts a ON a.id = l.accountId
      WHERE e.status = 'POSTED' AND a.accountType = 'EXPENSE'
      GROUP BY a.id, a.accountName
      ORDER BY amount DESC
      LIMIT 8`,
      [],
    )

    const expenseBreakdown = (expenseByAccountRows || []).map((r) => {
      const amount = Math.max(0, toNumber((r as any).amount))
      const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      return {
        category: String((r as any).accountName || "Other"),
        amount,
        percentage: Math.round(percentage * 10) / 10,
      }
    })

    // Top paying students from finance_student_transactions.
    const topPayingStudentsSql =
      studentsTable === "students"
        ? `SELECT
            COALESCE(u.name, '') as studentName,
            COALESCE(SUM(t.amount), 0) as amountPaid
          FROM finance_student_transactions t
          JOIN students s ON s.id = t.studentId
          LEFT JOIN users u ON u.id = s.userId
          WHERE t.transactionType = 'PAYMENT'
            AND t.transactionDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
          GROUP BY s.id, u.name
          ORDER BY amountPaid DESC
          LIMIT 5`
        : `SELECT
            CONCAT(s.firstName, ' ', s.lastName) as studentName,
            COALESCE(SUM(t.amount), 0) as amountPaid
          FROM finance_student_transactions t
          JOIN academic_module_students s ON s.id = t.studentId
          WHERE t.transactionType = 'PAYMENT'
            AND t.transactionDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
          GROUP BY s.id, s.firstName, s.lastName
          ORDER BY amountPaid DESC
          LIMIT 5`

    const topPayingStudentsRows = await dbQuery<RowDataPacket & { studentName: string; amountPaid: string | number }>(
      topPayingStudentsSql,
      [],
    )
    const topPayingStudents = (topPayingStudentsRows || []).map((r) => ({
      studentName: String((r as any).studentName || ""),
      amountPaid: Math.max(0, toNumber((r as any).amountPaid)),
    }))

    const stats: FinancialDashboardStats = {
      totalRevenue,
      totalExpenses,
      netIncome,
      cashBalance,
      accountsReceivable,
      accountsPayable,
      studentFeesOwed: accountsReceivable,
      payrollLiability: 0,
      monthlyRevenueTrend,
      expenseBreakdown,
      topPayingStudents,
      overdueAccounts: [],
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching financial dashboard stats:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}