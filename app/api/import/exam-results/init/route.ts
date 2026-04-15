import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import * as XLSX from "xlsx"
import { parse as parseCsv } from "csv-parse/sync"

import { ensureExamResultsImportTables } from "../_db"
import { dbQuery } from "@/lib/db"
import { AuthService } from "@/lib/auth"

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\uFFFD/g, "")
    .replace(/[\u0000-\u001F]+/g, " ")
    .trim()
}

function normalizeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>()
  return headers.map((h) => {
    const base = cleanText(h)
    if (!base) return ""
    const key = base.toLowerCase()
    const count = (seen.get(key) ?? 0) + 1
    seen.set(key, count)
    return count === 1 ? base : `${base} (${count})`
  })
}

function parseCsvFile(text: string): { headers: string[]; rows: Array<Record<string, string>> } {
  const raw = parseCsv(text, {
    columns: false,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as unknown as string[][]

  const headerRow = raw[0] || []
  const headers = normalizeHeaders(headerRow)

  const rows: Array<Record<string, string>> = []
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] || []
    const out: Record<string, string> = {}
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c]
      if (!h) continue
      out[h] = cleanText(row[c])
    }
    const hasAny = Object.values(out).some((v) => Boolean(cleanText(v)))
    if (hasAny) rows.push(out)
  }

  return { headers, rows }
}

function parseXlsxFile(buffer: Buffer): { headers: string[]; rows: Array<Record<string, string>> } {
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const firstSheet = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheet]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as Array<any[]>

  if (!data.length) return { headers: [], rows: [] }

  const rawHeaders = (data[0] || []).map((h) => cleanText(h))
  const headers = normalizeHeaders(rawHeaders)

  const rows: Array<Record<string, string>> = []
  for (let i = 1; i < data.length; i++) {
    const row = data[i] || []
    const out: Record<string, string> = {}
    for (let c = 0; c < headers.length; c++) {
      const header = headers[c]
      if (!header) continue
      out[header] = cleanText(row[c])
    }
    const hasAny = Object.values(out).some((v) => Boolean(cleanText(v)))
    if (hasAny) rows.push(out)
  }

  return { headers, rows }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")
    const userName = request.headers.get("x-user-name")

    if (!userId) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
    }

    const user = {
      id: userId,
      role: (userRole as any) || "student",
      name: userName || "",
      isActive: true,
      email: "",
      permissions: [],
      createdAt: new Date(0),
    } as any

    if (!AuthService.hasPermission(user, "exam_results", "create") && !AuthService.hasPermission(user, "exam_results", "update")) {
      return NextResponse.json({ success: false, message: "Insufficient permissions" }, { status: 403 })
    }

    await ensureExamResultsImportTables()

    const form = await request.formData()
    const file = form.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: "file is required" }, { status: 400 })
    }

    const name = file.name || "import"
    const lower = name.toLowerCase()
    const fileType = lower.endsWith(".xlsx") ? "xlsx" : lower.endsWith(".csv") ? "csv" : ""
    if (!fileType) {
      return NextResponse.json({ success: false, message: "Only .csv or .xlsx files are supported" }, { status: 400 })
    }

    const parsed = fileType === "csv" ? parseCsvFile(await file.text()) : parseXlsxFile(Buffer.from(await file.arrayBuffer()))
    if (!parsed.headers.length || parsed.rows.length === 0) {
      return NextResponse.json({ success: false, message: "No data rows found" }, { status: 400 })
    }

    const jobId = crypto.randomUUID()
    await dbQuery(
      "INSERT INTO exam_result_import_jobs (id, status, fileName, fileType, headersJson, createdById, createdByRole, createdByName) VALUES (?, 'UPLOADED', ?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, ''))",
      [jobId, name, fileType, JSON.stringify(parsed.headers), userId, String(userRole || ""), String(userName || "")],
    )

    const chunkSize = 500
    for (let i = 0; i < parsed.rows.length; i += chunkSize) {
      const chunk = parsed.rows.slice(i, i + chunkSize)
      const valuesSql: string[] = []
      const params: unknown[] = []
      for (let j = 0; j < chunk.length; j++) {
        valuesSql.push("(UUID(), ?, ?, ?, NOW(), NOW())")
        params.push(jobId, i + j + 2, JSON.stringify(chunk[j]))
      }
      await dbQuery(
        `INSERT INTO exam_result_import_rows (id, jobId, rowNumber, rawJson, createdAt, updatedAt) VALUES ${valuesSql.join(",")}`,
        params,
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        fileName: name,
        fileType,
        headers: parsed.headers,
        totalRows: parsed.rows.length,
        sampleRows: parsed.rows.slice(0, 5),
      },
    })
  } catch (error) {
    console.error("[POST /api/import/exam-results/init]", error)
    const message = error instanceof Error ? error.message : "Failed to initialize import"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
