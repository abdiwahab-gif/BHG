import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { dbQuery } from "@/lib/db"
import { ensureMembersTable } from "@/app/api/members/_db"
import { ensureDonationsTable } from "@/app/api/donations/_db"
import { ensureIncomesTable } from "@/app/api/incomes/_db"
import { ensureExpensesTable } from "@/app/api/expenses/_db"

export const runtime = "nodejs"

function monthKey(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

function lastNMonths(n: number): string[] {
  const result: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push(monthKey(d))
  }
  return result
}

export async function GET(_request: NextRequest) {
  try {
    await ensureMembersTable()
    await ensureDonationsTable()
    await ensureIncomesTable()
    await ensureExpensesTable()

    const memberCountRows = await dbQuery<RowDataPacket & { total: number }>(
      "SELECT COUNT(*) as total FROM academic_module_members",
      [],
    )
    const membersTotal = Number(memberCountRows?.[0]?.total || 0)

    const memberGenderRows = await dbQuery<RowDataPacket & { maleTotal: number; femaleTotal: number }>(
      `SELECT
         SUM(CASE WHEN LOWER(gender) = 'male' THEN 1 ELSE 0 END) as maleTotal,
         SUM(CASE WHEN LOWER(gender) = 'female' THEN 1 ELSE 0 END) as femaleTotal
       FROM academic_module_members`,
      [],
    )
    const membersMaleTotal = Number(memberGenderRows?.[0]?.maleTotal || 0)
    const membersFemaleTotal = Number(memberGenderRows?.[0]?.femaleTotal || 0)

    const topDeggenRows = await dbQuery<RowDataPacket & { name: string; total: number }>(
      `SELECT TRIM(deggen) as name, COUNT(*) as total
       FROM academic_module_members
       WHERE deggen IS NOT NULL AND TRIM(deggen) <> ''
       GROUP BY TRIM(deggen)
       ORDER BY total DESC, name ASC
       LIMIT 5`,
      [],
    )

    const topJobsRows = await dbQuery<RowDataPacket & { name: string; total: number }>(
      `SELECT TRIM(shaqada) as name, COUNT(*) as total
       FROM academic_module_members
       WHERE shaqada IS NOT NULL AND TRIM(shaqada) <> ''
       GROUP BY TRIM(shaqada)
       ORDER BY total DESC, name ASC
       LIMIT 5`,
      [],
    )

    const donationSumRows = await dbQuery<RowDataPacket & { total: string | number }>(
      "SELECT COALESCE(SUM(amount), 0) as total FROM academic_module_donations",
      [],
    )
    const donationsTotal = Number(donationSumRows?.[0]?.total || 0)

    const incomeSumRows = await dbQuery<RowDataPacket & { total: string | number }>(
      "SELECT COALESCE(SUM(amount), 0) as total FROM academic_module_incomes",
      [],
    )
    const incomeTotal = Number(incomeSumRows?.[0]?.total || 0)

    const expenseSumRows = await dbQuery<RowDataPacket & { total: string | number }>(
      "SELECT COALESCE(SUM(amount), 0) as total FROM academic_module_expenses",
      [],
    )
    const expenseTotal = Number(expenseSumRows?.[0]?.total || 0)

    const donorCountRows = await dbQuery<RowDataPacket & { total: number }>(
      `SELECT COUNT(DISTINCT donor) as total
       FROM (
         SELECT TRIM(donorName) as donor
         FROM academic_module_donations
         WHERE donorName IS NOT NULL AND TRIM(donorName) <> ''
         UNION
         SELECT TRIM(donorName) as donor
         FROM academic_module_incomes
         WHERE donorName IS NOT NULL AND TRIM(donorName) <> ''
       ) t`,
      [],
    )
    const donorsTotal = Number(donorCountRows?.[0]?.total || 0)

    const months = lastNMonths(6)

    const incomeByMonthRows = await dbQuery<RowDataPacket & { month: string; total: string | number }>(
      `SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COALESCE(SUM(amount), 0) as total
       FROM academic_module_incomes
       WHERE createdAt >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
       ORDER BY month ASC`,
      [],
    )
    const expenseByMonthRows = await dbQuery<RowDataPacket & { month: string; total: string | number }>(
      `SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COALESCE(SUM(amount), 0) as total
       FROM academic_module_expenses
       WHERE createdAt >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
       ORDER BY month ASC`,
      [],
    )

    const incomeMap = new Map((incomeByMonthRows || []).map((r) => [String(r.month), Number(r.total || 0)]))
    const expenseMap = new Map((expenseByMonthRows || []).map((r) => [String(r.month), Number(r.total || 0)]))

    const series = months.map((m) => {
      const income = incomeMap.get(m) ?? 0
      const expense = expenseMap.get(m) ?? 0
      return { month: m, income, expense, balance: income - expense }
    })

    return NextResponse.json({
      success: true,
      metrics: {
        membersTotal,
        membersMaleTotal,
        membersFemaleTotal,
        donorsTotal,
        donationsTotal,
        incomeTotal,
        expenseTotal,
        balance: incomeTotal - expenseTotal,
      },
      topDeggen: (topDeggenRows || []).map((r) => ({ name: String(r.name || "").trim(), total: Number(r.total || 0) })),
      topJobs: (topJobsRows || []).map((r) => ({ name: String(r.name || "").trim(), total: Number(r.total || 0) })),
      series,
    })
  } catch (error) {
    console.error("Error building fundraising summary:", error)
    return NextResponse.json({ error: "Failed to load summary" }, { status: 500 })
  }
}
