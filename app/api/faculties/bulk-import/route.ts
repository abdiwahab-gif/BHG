import { NextResponse } from "next/server"
import { z } from "zod"

import { dbQuery } from "@/lib/db"
import { ensureFacultiesTable } from "@/app/api/faculties/_db"

const rowSchema = z.object({
  facultyId: z.string().min(1),
  name: z.string().min(1),
  department: z.string().optional(),
})

type ImportError = {
  row: number
  field: string
  message: string
  value: string
}

type ImportResult = {
  success: number
  failed: number
  errors: ImportError[]
}

function normalizeHeaderKey(key: string): string {
  const k = String(key || "").trim()
  if (!k) return k
  const lower = k.toLowerCase()

  if (lower === "facultyid" || lower === "faculty_id" || lower === "faculty id" || lower === "id") return "facultyId"
  if (lower === "facultyname" || lower === "faculty_name" || lower === "faculty name" || lower === "name") return "name"
  if (lower === "department" || lower === "dept" || lower === "deptname" || lower === "dept_name") return "department"

  return k
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const headers = lines[0]
    .split(",")
    .map((h) => normalizeHeaderKey(h.trim()))

  const rows: Array<Record<string, string>> = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",")
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? "").trim()
    })
    rows.push(row)
  }
  return rows
}

export async function POST(request: Request) {
  try {
    await ensureFacultiesTable()

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "File is required" }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ success: false, error: "Only CSV files are supported for now" }, { status: 400 })
    }

    const csvText = await file.text()
    const rawRows = parseCsv(csvText)

    if (rawRows.length === 0) {
      return NextResponse.json({ success: false, error: "No data rows found" }, { status: 400 })
    }

    const result: ImportResult = { success: 0, failed: 0, errors: [] }

    for (let idx = 0; idx < rawRows.length; idx++) {
      const csvRowNumber = idx + 2
      const raw = rawRows[idx]

      try {
        const parsed = rowSchema.parse({
          facultyId: raw.facultyId,
          name: raw.name,
          department: raw.department,
        })

        if (parsed.facultyId.length > 50) {
          result.failed += 1
          result.errors.push({
            row: csvRowNumber,
            field: "facultyId",
            message: "facultyId is too long (max 50 characters)",
            value: parsed.facultyId,
          })
          continue
        }

        if (parsed.name.length > 150) {
          result.failed += 1
          result.errors.push({
            row: csvRowNumber,
            field: "name",
            message: "name is too long (max 150 characters)",
            value: parsed.name,
          })
          continue
        }

        const department = String(parsed.department ?? "").trim()
        if (department && department.length > 150) {
          result.failed += 1
          result.errors.push({
            row: csvRowNumber,
            field: "department",
            message: "department is too long (max 150 characters)",
            value: department,
          })
          continue
        }

        await dbQuery(
          `INSERT INTO academic_module_faculties (id, facultyId, name, department)
           VALUES (UUID(), ?, ?, NULLIF(?, ''))
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             department = VALUES(department),
             updatedAt = CURRENT_TIMESTAMP`,
          [parsed.facultyId.trim(), parsed.name.trim(), department],
        )

        result.success += 1
      } catch (e) {
        result.failed += 1
        if (e instanceof z.ZodError) {
          const first = e.issues[0]
          result.errors.push({
            row: csvRowNumber,
            field: String(first?.path?.[0] ?? "row"),
            message: first?.message || "Invalid row",
            value: "",
          })
        } else {
          result.errors.push({
            row: csvRowNumber,
            field: "row",
            message: e instanceof Error ? e.message : "Failed to import row",
            value: "",
          })
        }
      }
    }

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("[POST /api/faculties/bulk-import]", error)
    const message = error instanceof Error ? error.message : "Failed to import faculties"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
