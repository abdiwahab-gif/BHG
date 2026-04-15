import { dbQuery } from "@/lib/db"

export type DbExpenseRow = {
  id: string
  amount: string | number
  expenseType: string
  createdAt: string
  updatedAt: string
}

export async function ensureExpensesTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_expenses (
      id VARCHAR(36) PRIMARY KEY,
      amount DECIMAL(12,2) NOT NULL,
      expenseType VARCHAR(255) NOT NULL,

      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_expense_createdAt (createdAt),
      INDEX idx_expense_type (expenseType)
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

export function toExpenseDto(row: DbExpenseRow) {
  return {
    id: String(row.id),
    amount: toNumber(row.amount),
    expenseType: String(row.expenseType || ""),
    createdAt: toIsoDateTime(row.createdAt),
    updatedAt: toIsoDateTime(row.updatedAt),
  }
}
