import { dbQuery } from "@/lib/db"

export type DbIncomeRow = {
  id: string
  createdById?: string | null
  amount: string | number
  donorName: string | null
  createdAt: string
  updatedAt: string
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const rows = await dbQuery<any>(
    "SELECT COUNT(*) as total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [tableName, columnName],
  )
  return Number(rows?.[0]?.total || 0) > 0
}

export async function ensureIncomesTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_incomes (
      id VARCHAR(36) PRIMARY KEY,
      createdById VARCHAR(36) NULL,
      amount DECIMAL(12,2) NOT NULL,
      donorName VARCHAR(255) NULL,

      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_income_createdAt (createdAt),
      INDEX idx_income_createdById (createdById)
    ) ENGINE=InnoDB`,
    [],
  )

  if (!(await columnExists("academic_module_incomes", "createdById"))) {
    await dbQuery("ALTER TABLE academic_module_incomes ADD COLUMN createdById VARCHAR(36) NULL AFTER id", [])
    await dbQuery("CREATE INDEX idx_income_createdById ON academic_module_incomes (createdById)", [])
  }
}

function toIsoDateTime(value: unknown): string {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toISOString()
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number.parseFloat(value)
  return Number(value || 0)
}

export function toIncomeDto(row: DbIncomeRow) {
  return {
    id: String(row.id),
    amount: toNumber(row.amount),
    donorName: row.donorName ? String(row.donorName) : "",
    createdAt: toIsoDateTime(row.createdAt),
    updatedAt: toIsoDateTime(row.updatedAt),
  }
}
