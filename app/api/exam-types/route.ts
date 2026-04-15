import { type NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { dbQuery } from "@/lib/db"

type DbExamTypeRow = RowDataPacket & {
  id: string
  name: string
  code: string
  weight: number
  description: string | null
  isActive: number | boolean
  createdAt: Date | string
  updatedAt: Date | string
}

const examTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  weight: z.number().min(0).max(100, "Weight must be between 0 and 100"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
})

function normalizeExamTypeCode(code: string): string {
  const upper = String(code || "").trim().toUpperCase()
  if (upper === "ASSIGN") return "ASSIGNMENT"
  if (upper === "ATT") return "ATTENDANCE"
  if (upper === "MIDTERM") return "MID"
  return upper
}

function codeAliasesForLookup(code: string): string[] {
  const upper = normalizeExamTypeCode(code)
  if (upper === "ASSIGNMENT") return ["ASSIGNMENT", "ASSIGN"]
  if (upper === "ATTENDANCE") return ["ATTENDANCE", "ATT"]
  if (upper === "MID") return ["MID", "MIDTERM"]
  return [upper]
}

async function ensureExamTypesTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_exam_types (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(30) NOT NULL,
      weight DECIMAL(6,2) NOT NULL DEFAULT 0,
      description TEXT NULL,
      isActive BOOLEAN NOT NULL DEFAULT TRUE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_code (code),
      INDEX idx_isActive (isActive),
      INDEX idx_name (name)
    ) ENGINE=InnoDB`,
    [],
  )
}

async function seedDefaultExamTypesIfEmpty(): Promise<void> {
  const rows = await dbQuery<RowDataPacket & { total: number }>(
    "SELECT COUNT(*) as total FROM academic_module_exam_types",
    [],
  )
  const total = Number(rows?.[0]?.total || 0)
  if (total > 0) return

  const defaults = [
    { name: "Midterm Exam", code: "MID", weight: 30, description: "Mid-semester examination" },
    { name: "Final Exam", code: "FINAL", weight: 50, description: "Final semester examination" },
    { name: "Assignment", code: "ASSIGNMENT", weight: 10, description: "Course assignments" },
    { name: "Attendance", code: "ATTENDANCE", weight: 10, description: "Attendance score" },
  ]

  for (const item of defaults) {
    await dbQuery(
      "INSERT INTO academic_module_exam_types (id, name, code, weight, description, isActive) VALUES (UUID(), ?, ?, ?, ?, TRUE)",
      [item.name, item.code, item.weight, item.description],
    )
  }
}

function toExamTypeDto(row: DbExamTypeRow) {
  return {
    id: String(row.id),
    name: String(row.name),
    code: normalizeExamTypeCode(String(row.code)),
    weight: Number(row.weight),
    description: row.description ? String(row.description) : "",
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function GET() {
  try {
    await ensureExamTypesTable()
    await seedDefaultExamTypesIfEmpty()

    const rows = await dbQuery<DbExamTypeRow>(
      "SELECT id, name, code, weight, description, isActive, createdAt, updatedAt FROM academic_module_exam_types WHERE isActive = TRUE ORDER BY createdAt DESC",
      [],
    )

    const seen = new Set<string>()
    const data = (rows || [])
      .map(toExamTypeDto)
      .filter((dto) => {
        if (seen.has(dto.code)) return false
        seen.add(dto.code)
        return true
      })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error fetching exam types:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch exam types" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureExamTypesTable()

    const body = await request.json()
    const validatedData = examTypeSchema.parse(body)

    const name = validatedData.name.trim()
    const code = normalizeExamTypeCode(validatedData.code)

    const aliases = codeAliasesForLookup(code)
    const placeholders = aliases.map(() => "?").join(",")

    const existing = await dbQuery<RowDataPacket & { id: string }>(
      `SELECT id FROM academic_module_exam_types WHERE UPPER(code) IN (${placeholders}) LIMIT 1`,
      aliases,
    )
    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: "Exam type code already exists" }, { status: 409 })
    }

    await dbQuery(
      "INSERT INTO academic_module_exam_types (id, name, code, weight, description, isActive) VALUES (UUID(), ?, ?, ?, NULLIF(?, ''), ?)",
      [name, code, validatedData.weight, validatedData.description || "", validatedData.isActive],
    )

    const created = await dbQuery<DbExamTypeRow>(
      "SELECT id, name, code, weight, description, isActive, createdAt, updatedAt FROM academic_module_exam_types WHERE UPPER(code) = UPPER(?) ORDER BY createdAt DESC LIMIT 1",
      [code],
    )

    return NextResponse.json(
      {
        success: true,
        data: created[0] ? toExamTypeDto(created[0]) : null,
        message: "Exam type created successfully",
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Validation failed", details: error.errors }, { status: 400 })
    }

    console.error("Error creating exam type:", error)
    return NextResponse.json({ success: false, error: "Failed to create exam type" }, { status: 500 })
  }
}
