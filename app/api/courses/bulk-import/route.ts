import { NextResponse } from "next/server"
import { z } from "zod"

import { dbQuery } from "@/lib/db"
import { ensureCoursesTable } from "@/app/api/courses/_db"
import { ensureFacultiesTable } from "@/app/api/faculties/_db"

const rowSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  code: z.string().min(1),
  credits: z.coerce.number(),
  facultyId: z.string().optional(),
  faculty: z.string().optional(),
  department: z.string().optional(),
})

type ImportError = {
  row: number
  field: string
  message: string
  value: string
}

type ImportResult = {
  inserted: number
  updated: number
  failed: number
  errors: ImportError[]
}

function normalizeHeaderKey(key: string): string {
  const k = String(key || "").trim()
  if (!k) return k
  const lower = k.toLowerCase()

  if (lower === "course" || lower === "coursename" || lower === "course_name" || lower === "course name" || lower === "name") return "name"
  if (lower === "coursetype" || lower === "course_type" || lower === "course type" || lower === "type") return "type"
  if (lower === "coursecode" || lower === "course_code" || lower === "course code" || lower === "code") return "code"
  if (lower === "coursecredits" || lower === "course_credits" || lower === "course credits" || lower === "credits") return "credits"
  if (lower === "facultyid" || lower === "faculty_id" || lower === "faculty id") return "facultyId"
  if (lower === "faculty" || lower === "facultyname" || lower === "faculty_name" || lower === "faculty name") return "faculty"
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

function normalizeCourseType(type: string): "Core" | "Elective" | null {
  const t = String(type || "").trim().toLowerCase()
  if (t === "core") return "Core"
  if (t === "elective") return "Elective"
  return null
}

export async function POST(request: Request) {
  try {
    await ensureCoursesTable()
    // Faculties are optional; but if facultyId is used, we need this table.
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

    const result: ImportResult = { inserted: 0, updated: 0, failed: 0, errors: [] }

    for (let idx = 0; idx < rawRows.length; idx++) {
      const csvRowNumber = idx + 2
      const raw = rawRows[idx]

      try {
        const parsed = rowSchema.parse({
          name: raw.name,
          type: raw.type,
          code: raw.code,
          credits: raw.credits,
          facultyId: raw.facultyId,
          faculty: raw.faculty,
          department: raw.department,
        })

        const normalizedType = normalizeCourseType(parsed.type)
        if (!normalizedType) {
          result.failed += 1
          result.errors.push({
            row: csvRowNumber,
            field: "type",
            message: "type must be Core or Elective",
            value: parsed.type,
          })
          continue
        }

        const name = parsed.name.trim()
        const code = parsed.code.trim()
        const credits = Number(parsed.credits)
        if (!Number.isFinite(credits) || credits <= 0 || credits > 50) {
          result.failed += 1
          result.errors.push({
            row: csvRowNumber,
            field: "credits",
            message: "credits must be a number between 0 and 50",
            value: String(parsed.credits),
          })
          continue
        }
        if (name.length > 100) {
          result.failed += 1
          result.errors.push({
            row: csvRowNumber,
            field: "name",
            message: "Course name is too long (max 100 characters)",
            value: name,
          })
          continue
        }
        if (code.length > 30) {
          result.failed += 1
          result.errors.push({
            row: csvRowNumber,
            field: "code",
            message: "Course code is too long (max 30 characters)",
            value: code,
          })
          continue
        }

        let facultyName = String(parsed.faculty ?? "").trim()
        let department = String(parsed.department ?? "").trim()

        const facultyId = String(parsed.facultyId ?? "").trim()
        if (facultyId) {
          const facultyRows = await dbQuery<any>(
            "SELECT facultyId, name, department FROM academic_module_faculties WHERE LOWER(facultyId) = LOWER(?) LIMIT 1",
            [facultyId],
          )
          if (facultyRows.length === 0) {
            result.failed += 1
            result.errors.push({
              row: csvRowNumber,
              field: "facultyId",
              message: "Faculty not found for facultyId",
              value: facultyId,
            })
            continue
          }
          facultyName = String(facultyRows[0]?.name || "").trim()
          department = department || String(facultyRows[0]?.department || "").trim()
        }

        // Update existing course by code if present; else insert.
        const existing = await dbQuery<any>(
          "SELECT id FROM academic_module_courses WHERE LOWER(code) = LOWER(?) LIMIT 1",
          [code],
        )

        if (existing.length > 0) {
          await dbQuery(
            "UPDATE academic_module_courses SET name = ?, type = ?, credits = ?, faculty = NULLIF(?, ''), department = NULLIF(?, '') WHERE id = ?",
            [name, normalizedType, credits, facultyName, department, String(existing[0].id)],
          )
          result.updated += 1
        } else {
          await dbQuery(
            "INSERT INTO academic_module_courses (id, name, type, code, credits, faculty, department) VALUES (UUID(), ?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, ''))",
            [name, normalizedType, code, credits, facultyName, department],
          )
          result.inserted += 1
        }
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
    console.error("[POST /api/courses/bulk-import]", error)
    const message = error instanceof Error ? error.message : "Failed to import courses"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
