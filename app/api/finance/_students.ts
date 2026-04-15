import type { RowDataPacket } from "mysql2/promise"
import { dbQuery } from "@/lib/db"

export type FinanceStudentsTable = "academic_module_students" | "students"

export class FinanceStudentsTableResolutionError extends Error {
  status: number

  constructor(message: string, status = 409) {
    super(message)
    this.name = "FinanceStudentsTableResolutionError"
    this.status = status
  }
}

type ExistsRow = RowDataPacket & { tableName: string }

async function tableExists(tableName: FinanceStudentsTable): Promise<boolean> {
  const rows = await dbQuery<ExistsRow>(
    "SELECT TABLE_NAME as tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1",
    [tableName],
  )
  return String(rows?.[0]?.tableName || "") === tableName
}

function normalizeOverride(value: unknown): FinanceStudentsTable | null {
  const v = String(value || "").trim()
  if (!v) return null
  if (v === "students" || v === "academic_module_students") return v
  return null
}

function isTrueEnv(value: unknown): boolean {
  const v = String(value || "").trim().toLowerCase()
  return v === "1" || v === "true" || v === "yes" || v === "on"
}

/**
 * Resolve which students table to read from for finance.
 *
 * Priority:
 * 1) FINANCE_STUDENTS_TABLE override (must exist)
 * 2) Prefer academic_module_students if it exists (this matches /api/students)
 *    - Note: academic_module_students may be a VIEW over students in some DBs.
 * 3) Otherwise, fall back to students if it exists
 * 4) Fallback: academic_module_students (will error later if truly missing)
 */
export async function resolveFinanceStudentsTable(): Promise<FinanceStudentsTable> {
  const override = normalizeOverride(process.env.FINANCE_STUDENTS_TABLE)
  if (override) {
    if (override === "students" && !isTrueEnv(process.env.FINANCE_ALLOW_STUDENTS_TABLE_OVERRIDE)) {
      throw new FinanceStudentsTableResolutionError(
        "FINANCE_STUDENTS_TABLE is set to 'students' but Finance is configured to stay integrated with /api/students. Remove FINANCE_STUDENTS_TABLE or set it to 'academic_module_students'. To override anyway, set FINANCE_ALLOW_STUDENTS_TABLE_OVERRIDE=true.",
      )
    }

    const exists = await tableExists(override)
    if (!exists) {
      throw new FinanceStudentsTableResolutionError(
        `FINANCE_STUDENTS_TABLE is set to '${override}' but that table does not exist in the current database.`,
      )
    }
    return override
  }

  const hasAcademicModule = await tableExists("academic_module_students").catch(() => false)
  if (hasAcademicModule) return "academic_module_students"

  const hasStudents = await tableExists("students").catch(() => false)
  if (hasStudents) return "students"

  return "academic_module_students"
}

export function financeStudentsTableMeta(table: FinanceStudentsTable): {
  studentNumberColumn: string
  hasClassSection: boolean
} {
  if (table === "students") {
    return { studentNumberColumn: "studentId", hasClassSection: false }
  }
  return { studentNumberColumn: "studentId", hasClassSection: true }
}
