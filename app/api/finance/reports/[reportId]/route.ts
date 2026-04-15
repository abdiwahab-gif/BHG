import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import PDFDocument from "pdfkit"
import * as XLSX from "xlsx"
import { dbQuery } from "@/lib/db"
import { ensureFinanceCoreTables } from "../../_db"
import { FinanceStudentsTableResolutionError, financeStudentsTableMeta, resolveFinanceStudentsTable } from "../../_students"

export const runtime = "nodejs"

type ReportFormat = "PDF" | "EXCEL" | "CSV" | "JSON"

type TrialBalanceRow = {
  accountCode: string
  accountName: string
  accountType: string
  debit: number
  credit: number
  balance: number
}

type CashFlowItemRow = {
  section: "BEGINNING" | "OPERATING" | "INVESTING" | "FINANCING" | "ENDING"
  description: string
  amount: number
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number.parseFloat(value)
  return Number(value || 0)
}

function toYmd(value: any): string {
  if (!value) return ""
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  const s = String(value)
  return s.length >= 10 ? s.slice(0, 10) : s
}

function isYmd(value: string | null): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function getFormat(request: NextRequest): ReportFormat {
  const raw = (request.nextUrl.searchParams.get("format") || "PDF").toUpperCase()
  if (raw === "PDF" || raw === "EXCEL" || raw === "CSV" || raw === "JSON") return raw
  return "PDF"
}

function filename(reportId: string, format: ReportFormat): string {
  const ext = format === "EXCEL" ? "xlsx" : format.toLowerCase()
  const safeId = reportId.replace(/[^a-z0-9\-]/gi, "-")
  return `${safeId}.${ext}`
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = String(v ?? "")
    if (/[\n\r,"]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.join(",")]
  for (const row of rows) {
    lines.push(headers.map((h) => escape((row as any)[h])).join(","))
  }
  return lines.join("\n")
}

async function writePdf(title: string, meta: Record<string, unknown>, rows: Array<Record<string, unknown>>): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 })
    const chunks: Buffer[] = []

    doc.on("data", (chunk: unknown) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any)))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", (err: unknown) => reject(err instanceof Error ? err : new Error(String(err))))

    doc.fontSize(18).text(title)
    doc.moveDown(0.5)

    doc.fontSize(10)
    for (const [k, v] of Object.entries(meta)) {
      doc.text(`${k}: ${String(v ?? "")}`)
    }

    doc.moveDown(1)

    if (!rows.length) {
      doc.fontSize(12).text("No data")
      doc.end()
      return
    }

    doc.fontSize(10)
    const headers = Object.keys(rows[0])
    doc.text(headers.join(" | "))
    doc.moveDown(0.25)

    for (const r of rows) {
      const line = headers.map((h) => String((r as any)[h] ?? "")).join(" | ")
      doc.text(line)
    }

    doc.end()
  })
}

async function trialBalance(dateFrom?: string, dateTo?: string): Promise<TrialBalanceRow[]> {
  const from = isYmd(dateFrom || null) ? dateFrom! : null
  const to = isYmd(dateTo || null) ? dateTo! : null

  const params: unknown[] = []
  let dateClause = ""
  if (from) {
    dateClause += " AND e.entryDate >= ?"
    params.push(from)
  }
  if (to) {
    dateClause += " AND e.entryDate <= ?"
    params.push(to)
  }

  const rows = await dbQuery<RowDataPacket & {
    accountCode: string
    accountName: string
    accountType: string
    debit: string | number
    credit: string | number
    balance: string | number
  }>(
    `SELECT
      a.accountCode as accountCode,
      a.accountName as accountName,
      a.accountType as accountType,
      COALESCE(SUM(CASE WHEN e.status = 'POSTED'${dateClause} THEN l.debitAmount ELSE 0 END), 0) as debit,
      COALESCE(SUM(CASE WHEN e.status = 'POSTED'${dateClause} THEN l.creditAmount ELSE 0 END), 0) as credit,
      COALESCE(SUM(CASE WHEN e.status = 'POSTED'${dateClause} THEN (l.debitAmount - l.creditAmount) ELSE 0 END), 0) as balance
    FROM gl_accounts a
    LEFT JOIN gl_journal_lines l ON l.accountId = a.id
    LEFT JOIN gl_journal_entries e ON e.id = l.journalEntryId
    GROUP BY a.id, a.accountCode, a.accountName, a.accountType
    ORDER BY a.accountCode ASC`,
    [...params, ...params, ...params],
  )

  return (rows || []).map((r) => ({
    accountCode: String((r as any).accountCode),
    accountName: String((r as any).accountName),
    accountType: String((r as any).accountType),
    debit: toNumber((r as any).debit),
    credit: toNumber((r as any).credit),
    balance: toNumber((r as any).balance),
  }))
}

async function generalLedger(dateFrom?: string, dateTo?: string) {
  const from = isYmd(dateFrom || null) ? dateFrom! : null
  const to = isYmd(dateTo || null) ? dateTo! : null

  const where: string[] = ["e.status = 'POSTED'"]
  const params: unknown[] = []
  if (from) {
    where.push("e.entryDate >= ?")
    params.push(from)
  }
  if (to) {
    where.push("e.entryDate <= ?")
    params.push(to)
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

  const rows = await dbQuery<RowDataPacket & {
    entryNumber: string
    entryDate: any
    entryType: string
    entryDescription: string
    reference: string | null
    accountCode: string
    accountName: string
    lineDescription: string
    debitAmount: string | number
    creditAmount: string | number
  }>(
    `SELECT
      e.entryNumber as entryNumber,
      e.entryDate as entryDate,
      e.entryType as entryType,
      e.description as entryDescription,
      e.reference as reference,
      a.accountCode as accountCode,
      a.accountName as accountName,
      l.description as lineDescription,
      l.debitAmount as debitAmount,
      l.creditAmount as creditAmount
    FROM gl_journal_entries e
    JOIN gl_journal_lines l ON l.journalEntryId = e.id
    JOIN gl_accounts a ON a.id = l.accountId
    ${whereSql}
    ORDER BY e.entryDate ASC, e.entryNumber ASC, l.lineNumber ASC`,
    params,
  )

  const normalizeDate = (v: any) => {
    if (!v) return ""
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10)
    const s = String(v)
    return s.length >= 10 ? s.slice(0, 10) : s
  }

  return (rows || []).map((r) => ({
    entryNumber: String((r as any).entryNumber),
    entryDate: normalizeDate((r as any).entryDate),
    entryType: String((r as any).entryType),
    description: String((r as any).entryDescription),
    reference: (r as any).reference ? String((r as any).reference) : "",
    accountCode: String((r as any).accountCode),
    accountName: String((r as any).accountName),
    lineDescription: String((r as any).lineDescription),
    debit: toNumber((r as any).debitAmount),
    credit: toNumber((r as any).creditAmount),
  }))
}

async function cashAccountId(): Promise<string> {
  const rows = await dbQuery<RowDataPacket & { id: string }>("SELECT id FROM gl_accounts WHERE accountCode = '1000' LIMIT 1", [])
  return rows?.[0]?.id ? String(rows[0].id) : ""
}

async function accountIdByCode(code: string): Promise<string> {
  const rows = await dbQuery<RowDataPacket & { id: string }>("SELECT id FROM gl_accounts WHERE accountCode = ? LIMIT 1", [code])
  return rows?.[0]?.id ? String(rows[0].id) : ""
}

async function cashBalanceAsOf(cashId: string, dateToExclusive?: string | null): Promise<number> {
  const params: unknown[] = [cashId]
  let dateClause = ""
  if (dateToExclusive && isYmd(dateToExclusive)) {
    dateClause = " AND e.entryDate < ?"
    params.push(dateToExclusive)
  }

  const rows = await dbQuery<RowDataPacket & { balance: string | number }>(
    `SELECT COALESCE(SUM(l.debitAmount - l.creditAmount), 0) as balance
     FROM gl_journal_lines l
     JOIN gl_journal_entries e ON e.id = l.journalEntryId
     WHERE e.status = 'POSTED' AND l.accountId = ?${dateClause}`,
    params,
  )
  return toNumber((rows as any)?.[0]?.balance)
}

async function cashMovementsByEntryType(cashId: string, dateFrom?: string, dateTo?: string) {
  const from = isYmd(dateFrom || null) ? dateFrom! : null
  const to = isYmd(dateTo || null) ? dateTo! : null

  const where: string[] = ["e.status = 'POSTED'", "l.accountId = ?"]
  const params: unknown[] = [cashId]

  if (from) {
    where.push("e.entryDate >= ?")
    params.push(from)
  }
  if (to) {
    where.push("e.entryDate <= ?")
    params.push(to)
  }

  const rows = await dbQuery<RowDataPacket & { entryType: string; net: string | number }>(
    `SELECT e.entryType as entryType, COALESCE(SUM(l.debitAmount - l.creditAmount), 0) as net
     FROM gl_journal_entries e
     JOIN gl_journal_lines l ON l.journalEntryId = e.id
     WHERE ${where.join(" AND ")}
     GROUP BY e.entryType
     ORDER BY e.entryType ASC`,
    params,
  )

  return (rows || []).map((r) => ({
    entryType: String((r as any).entryType || "GENERAL"),
    net: toNumber((r as any).net),
  }))
}

async function cashFlow(dateFrom?: string, dateTo?: string) {
  const cashId = await cashAccountId()
  if (!cashId) {
    return {
      error: "Chart of Accounts is not initialized",
      message: "Run POST /api/finance/seed (FINANCE_SEED_KEY required) to create account 1000 (Cash).",
      status: 409 as const,
    }
  }

  const from = isYmd(dateFrom || null) ? dateFrom! : null
  const to = isYmd(dateTo || null) ? dateTo! : null

  const addDays = (ymd: string, days: number) => {
    const d = new Date(`${ymd}T00:00:00.000Z`)
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
  }

  // beginningCash = cash balance strictly before dateFrom
  // endingCash = cash balance through dateTo (inclusive)
  const beginningCash = from ? await cashBalanceAsOf(cashId, from) : 0
  const endingCash = to ? await cashBalanceAsOf(cashId, addDays(to, 1)) : await cashBalanceAsOf(cashId, null)

  const movements = await cashMovementsByEntryType(cashId, from || undefined, to || undefined)
  const operatingItems = movements.map((m) => ({
    description: `Net cash from ${m.entryType}`,
    amount: m.net,
    entryType: m.entryType,
  }))

  const operatingCashFlow = operatingItems.reduce((s, i) => s + i.amount, 0)
  const investingCashFlow = 0
  const financingCashFlow = 0
  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow

  const rowsForExport: CashFlowItemRow[] = [
    { section: "BEGINNING", description: "Beginning cash balance", amount: beginningCash },
    ...operatingItems.map((i) => ({ section: "OPERATING" as const, description: i.description, amount: i.amount })),
    { section: "INVESTING", description: "Net cash from investing activities", amount: investingCashFlow },
    { section: "FINANCING", description: "Net cash from financing activities", amount: financingCashFlow },
    { section: "ENDING", description: "Ending cash balance", amount: endingCash },
  ]

  return {
    title: "Cash Flow Statement",
    meta: {
      dateFrom: from || "",
      dateTo: to || "",
    },
    data: {
      startDate: from || "",
      endDate: to || "",
      operatingCashFlow,
      investingCashFlow,
      financingCashFlow,
      netCashFlow,
      beginningCash,
      endingCash,
      operatingActivities: operatingItems,
      investingActivities: [],
      financingActivities: [],
    },
    rowsForExport,
  }
}

async function accountsReceivableAging() {
  let studentsTable: Awaited<ReturnType<typeof resolveFinanceStudentsTable>>
  try {
    studentsTable = await resolveFinanceStudentsTable()
  } catch (e) {
    if (e instanceof FinanceStudentsTableResolutionError) {
      return { status: e.status, error: "Student table resolution failed", message: e.message }
    }
    throw e
  }

  const joinSql =
    studentsTable === "students"
      ? "JOIN students s ON s.id = agg.studentId LEFT JOIN users u ON u.id = s.userId"
      : "JOIN academic_module_students s ON s.id = agg.studentId"

  const selectNameSql =
    studentsTable === "students"
      ? "COALESCE(u.name, '') as firstName, '' as lastName, s.studentId as studentNumber"
      : "s.firstName as firstName, s.lastName as lastName, s.studentId as studentNumber"

  const rows = await dbQuery<RowDataPacket & {
    studentId: string
    firstName: string
    lastName: string
    studentNumber: string
    amountDue: string | number
    oldestChargeDate: any
    daysOutstanding: number
  }>(
    `SELECT
      s.id as studentId,
      ${selectNameSql},
      agg.amountDue as amountDue,
      agg.oldestChargeDate as oldestChargeDate,
      DATEDIFF(CURDATE(), agg.oldestChargeDate) as daysOutstanding
    FROM (
      SELECT
        studentId,
        (COALESCE(SUM(CASE WHEN transactionType = 'CHARGE' THEN amount ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN transactionType = 'PAYMENT' THEN amount ELSE 0 END), 0)) as amountDue,
        MIN(CASE WHEN transactionType = 'CHARGE' THEN transactionDate ELSE NULL END) as oldestChargeDate
      FROM finance_student_transactions
      GROUP BY studentId
    ) agg
    ${joinSql}
    WHERE agg.amountDue > 0.01 AND agg.oldestChargeDate IS NOT NULL
    ORDER BY daysOutstanding DESC`,
    [],
  )

  const bucket = (days: number) => {
    if (days <= 30) return "0-30"
    if (days <= 60) return "31-60"
    if (days <= 90) return "61-90"
    return "90+"
  }

  const detailRows = (rows || []).map((r) => {
    const days = Number((r as any).daysOutstanding || 0)
    const amountDue = toNumber((r as any).amountDue)
    const studentName = `${String((r as any).firstName)} ${String((r as any).lastName)}`.trim()
    return {
      studentId: String((r as any).studentId),
      studentNumber: String((r as any).studentNumber),
      studentName,
      oldestChargeDate: toYmd((r as any).oldestChargeDate),
      daysOutstanding: days,
      bucket: bucket(days),
      amountDue,
    }
  })

  const totals = {
    "0-30": 0,
    "31-60": 0,
    "61-90": 0,
    "90+": 0,
    total: 0,
  }

  for (const r of detailRows) {
    ;(totals as any)[r.bucket] += r.amountDue
    totals.total += r.amountDue
  }

  return {
    title: "Accounts Receivable Aging",
    data: { rows: detailRows, totals },
    rowsForExport: detailRows as Array<Record<string, unknown>>,
  }
}

async function accountsPayableAging() {
  const rows = await dbQuery<RowDataPacket & {
    vendorName: string
    dueDate: any
    amountDue: string | number
  }>(
    `SELECT vendorName, dueDate, amountDue
     FROM finance_bills
     WHERE amountDue > 0.01
     ORDER BY dueDate ASC`,
    [],
  )

  const today = new Date().toISOString().slice(0, 10)
  type ApBucket = "CURRENT" | "1-30" | "31-60" | "61-90" | "90+"

  const bucketFor = (dueDate: string): ApBucket => {
    if (dueDate >= today) return "CURRENT"
    const days = Math.max(0, Math.floor((Date.parse(today) - Date.parse(dueDate)) / 86400000))
    if (days <= 30) return "1-30"
    if (days <= 60) return "31-60"
    if (days <= 90) return "61-90"
    return "90+"
  }

  const byVendor = new Map<
    string,
    { vendorName: string; CURRENT: number; "1-30": number; "31-60": number; "61-90": number; "90+": number; totalDue: number }
  >()

  for (const r of rows || []) {
    const vendorName = String((r as any).vendorName || "")
    const dueDate = toYmd((r as any).dueDate)
    const amountDue = toNumber((r as any).amountDue)
    const b = bucketFor(dueDate)

    const existing = byVendor.get(vendorName) || {
      vendorName,
      CURRENT: 0,
      "1-30": 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
      totalDue: 0,
    }

    existing[b] += amountDue
    existing.totalDue += amountDue
    byVendor.set(vendorName, existing)
  }

  const vendorRows = Array.from(byVendor.values()).sort((a, b) => b.totalDue - a.totalDue)

  const totals = vendorRows.reduce(
    (acc, v) => {
      acc.CURRENT += v.CURRENT
      acc["1-30"] += v["1-30"]
      acc["31-60"] += v["31-60"]
      acc["61-90"] += v["61-90"]
      acc["90+"] += v["90+"]
      acc.totalDue += v.totalDue
      return acc
    },
    { CURRENT: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0, totalDue: 0 },
  )

  return {
    title: "Accounts Payable Aging",
    data: { rows: vendorRows, totals },
    rowsForExport: vendorRows as Array<Record<string, unknown>>,
  }
}

async function incomeStatement(dateFrom?: string, dateTo?: string) {
  const tb = await trialBalance(dateFrom, dateTo)
  const revenue = tb.filter((r) => r.accountType === "REVENUE").map((r) => ({
    accountCode: r.accountCode,
    accountName: r.accountName,
    amount: Math.max(0, r.credit - r.debit),
  }))

  const expenses = tb.filter((r) => r.accountType === "EXPENSE").map((r) => ({
    accountCode: r.accountCode,
    accountName: r.accountName,
    amount: Math.max(0, r.debit - r.credit),
  }))

  const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0)
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0)

  return {
    revenue,
    expenses,
    totals: {
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
    },
  }
}

async function balanceSheet(asOf?: string) {
  const dateTo = isYmd(asOf || null) ? asOf! : undefined
  const tb = await trialBalance(undefined, dateTo)

  const assets = tb.filter((r) => r.accountType === "ASSET")
  const liabilities = tb
    .filter((r) => r.accountType === "LIABILITY")
    .map((r) => ({ ...r, balance: Math.max(0, r.credit - r.debit) }))
  const equity = tb
    .filter((r) => r.accountType === "EQUITY")
    .map((r) => ({ ...r, balance: Math.max(0, r.credit - r.debit) }))

  const assetTotal = assets.reduce((s, r) => s + r.balance, 0)
  const liabilityTotal = liabilities.reduce((s, r) => s + r.balance, 0)
  const equityTotal = equity.reduce((s, r) => s + r.balance, 0)

  return {
    assets,
    liabilities,
    equity,
    totals: {
      assets: assetTotal,
      liabilities: liabilityTotal,
      equity: equityTotal,
      liabilitiesPlusEquity: liabilityTotal + equityTotal,
    },
  }
}

export async function GET(request: NextRequest, { params }: { params: { reportId: string } }) {
  try {
    await ensureFinanceCoreTables()

    const reportId = String(params?.reportId || "").trim()
    const format = getFormat(request)

    const dateFrom = request.nextUrl.searchParams.get("dateFrom")
    const dateTo = request.nextUrl.searchParams.get("dateTo")
    const asOf = request.nextUrl.searchParams.get("asOf")

    const generatedAt = new Date().toISOString()

    if (!reportId) {
      return NextResponse.json({ error: "reportId is required" }, { status: 400 })
    }

    let title = ""
    let rowsForExport: Array<Record<string, unknown>> = []
    let jsonData: any = null

    if (reportId === "trial-balance") {
      title = "Trial Balance"
      const rows = await trialBalance(dateFrom || undefined, dateTo || undefined)
      rowsForExport = rows
      jsonData = { rows }
    } else if (reportId === "general-ledger") {
      title = "General Ledger"
      const rows = await generalLedger(dateFrom || undefined, dateTo || undefined)
      rowsForExport = rows
      jsonData = { rows }
    } else if (reportId === "income-statement") {
      title = "Income Statement"
      const data = await incomeStatement(dateFrom || undefined, dateTo || undefined)
      rowsForExport = [...data.revenue.map((r) => ({ section: "REVENUE", ...r })), ...data.expenses.map((r) => ({ section: "EXPENSE", ...r }))]
      jsonData = data
    } else if (reportId === "balance-sheet") {
      title = "Balance Sheet"
      const data = await balanceSheet(asOf || undefined)
      rowsForExport = [
        ...data.assets.map((r) => ({ section: "ASSET", ...r })),
        ...data.liabilities.map((r) => ({ section: "LIABILITY", ...r })),
        ...data.equity.map((r) => ({ section: "EQUITY", ...r })),
      ]
      jsonData = data
    } else if (reportId === "cash-flow") {
      const cf = await cashFlow(dateFrom || undefined, dateTo || undefined)
      if ((cf as any).status) {
        return NextResponse.json({ error: (cf as any).error, message: (cf as any).message }, { status: (cf as any).status })
      }
      title = (cf as any).title
      rowsForExport = (cf as any).rowsForExport
      jsonData = (cf as any).data
    } else if (reportId === "accounts-receivable") {
      const ar = await accountsReceivableAging()
      if ((ar as any).status) {
        return NextResponse.json({ error: (ar as any).error, message: (ar as any).message }, { status: (ar as any).status })
      }
      const arReport = ar as { title: string; rowsForExport: Array<Record<string, unknown>>; data: unknown }
      title = arReport.title
      rowsForExport = arReport.rowsForExport
      jsonData = arReport.data
    } else if (reportId === "accounts-payable") {
      const ap = await accountsPayableAging()
      title = ap.title
      rowsForExport = ap.rowsForExport
      jsonData = ap.data
    } else {
      return NextResponse.json(
        {
          error: "Report not implemented",
          reportId,
          message:
            "This report type needs additional subledger tables/endpoints. Implemented reports: trial-balance, income-statement, balance-sheet, general-ledger, cash-flow, accounts-receivable, accounts-payable.",
        },
        { status: 501 },
      )
    }

    const meta = {
      reportId,
      generatedAt,
      dateFrom: dateFrom || "",
      dateTo: dateTo || "",
      asOf: asOf || "",
      rowCount: rowsForExport.length,
    }

    if (format === "JSON") {
      return NextResponse.json({ title, meta, data: jsonData })
    }

    if (format === "CSV") {
      const csv = toCsv(rowsForExport)
      return new NextResponse(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename=\"${filename(reportId, format)}\"`,
        },
      })
    }

    if (format === "EXCEL") {
      const ws = XLSX.utils.json_to_sheet(rowsForExport)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Report")
      const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
      return new NextResponse(out as any, {
        headers: {
          "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-disposition": `attachment; filename=\"${filename(reportId, format)}\"`,
        },
      })
    }

    // PDF
    const pdf = await writePdf(title, meta, rowsForExport)
    return new NextResponse(pdf as any, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename=\"${filename(reportId, format)}\"`,
      },
    })
  } catch (error) {
    console.error("[GET /api/finance/reports/:reportId]", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
