import { dbQuery } from "@/lib/db"

export type DbIncomeRow = {
  id: string
  amount: string | number
  donorName: string | null
  createdAt: string
  updatedAt: string
}

export async function ensureIncomesTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_incomes (
      id VARCHAR(36) PRIMARY KEY,
      amount DECIMAL(12,2) NOT NULL,
      donorName VARCHAR(255) NULL,

      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_income_createdAt (createdAt)
    ) ENGINE=InnoDB`,
    [],
  )
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
