import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { dbQuery } from "@/lib/db"
import { ensureFinanceCoreTables } from "../_db"

type SeedAccount = {
  accountCode: string
  accountName: string
  accountType: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"
  accountSubType: string
  description?: string
  taxLineMapping?: string
}

function getSeedKeyFromRequest(request: NextRequest): string {
  return (
    request.headers.get("x-seed-key") ||
    request.nextUrl.searchParams.get("seedKey") ||
    ""
  ).trim()
}

export async function POST(request: NextRequest) {
  try {
    const requiredKey = (process.env.FINANCE_SEED_KEY || "").trim()
    if (!requiredKey) {
      return NextResponse.json(
        {
          error: "Finance seeding is disabled",
          message: "Set FINANCE_SEED_KEY in environment variables to enable /api/finance/seed.",
        },
        { status: 403 }
      )
    }

    const providedKey = getSeedKeyFromRequest(request)
    if (!providedKey || providedKey !== requiredKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await ensureFinanceCoreTables()

    const existingCountRows = await dbQuery<RowDataPacket & { total: string | number }>(
      "SELECT COUNT(*) as total FROM gl_accounts",
      [],
    )
    const existingTotal = Number(existingCountRows?.[0]?.total ?? 0)
    if (existingTotal > 0) {
      return NextResponse.json({ seeded: false, message: "Chart of Accounts already has accounts", existingTotal })
    }

    const seedAccounts: SeedAccount[] = [
      {
        accountCode: "1000",
        accountName: "Cash",
        accountType: "ASSET",
        accountSubType: "Current Assets",
        description: "Primary cash account",
      },
      {
        accountCode: "1100",
        accountName: "Accounts Receivable",
        accountType: "ASSET",
        accountSubType: "Current Assets",
        description: "Receivables from students/clients",
      },
      {
        accountCode: "2000",
        accountName: "Accounts Payable",
        accountType: "LIABILITY",
        accountSubType: "Current Liabilities",
        description: "Payables to suppliers",
      },
      {
        accountCode: "3000",
        accountName: "Owner's Equity",
        accountType: "EQUITY",
        accountSubType: "Equity",
      },
      {
        accountCode: "4000",
        accountName: "Tuition & Fees Revenue",
        accountType: "REVENUE",
        accountSubType: "Operating Revenue",
      },
      {
        accountCode: "5000",
        accountName: "Salaries Expense",
        accountType: "EXPENSE",
        accountSubType: "Operating Expenses",
      },
      {
        accountCode: "5100",
        accountName: "Supplies Expense",
        accountType: "EXPENSE",
        accountSubType: "Operating Expenses",
      },
    ]

    let inserted = 0
    for (const a of seedAccounts) {
      const id = crypto.randomUUID()
      await dbQuery(
        `INSERT INTO gl_accounts (
          id, accountCode, accountName, accountType, accountSubType, parentAccountId, description, taxLineMapping, isActive
        ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, TRUE)`,
        [
          id,
          a.accountCode,
          a.accountName,
          a.accountType,
          a.accountSubType,
          a.description || null,
          a.taxLineMapping || null,
        ],
      )
      inserted++
    }

    return NextResponse.json({ seeded: true, inserted })
  } catch (error) {
    console.error("[POST /api/finance/seed]", error)
    return NextResponse.json({ error: "Failed to seed chart of accounts" }, { status: 500 })
  }
}
