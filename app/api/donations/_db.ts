import { dbQuery } from "@/lib/db"

export type DbDonationRow = {
  id: string
  amount: string | number
  donorName: string | null
  mobileNumber: string | null
  email: string | null
  note: string | null
  status: string
  createdAt: string
}

export async function ensureDonationsTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_donations (
      id VARCHAR(36) PRIMARY KEY,
      amount DECIMAL(12,2) NOT NULL,
      donorName VARCHAR(255) NULL,
      mobileNumber VARCHAR(50) NULL,
      email VARCHAR(255) NULL,
      note TEXT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PLEDGED',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_donation_createdAt (createdAt),
      INDEX idx_donation_status (status)
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

export function toDonationDto(row: DbDonationRow) {
  return {
    id: String(row.id),
    amount: toNumber(row.amount),
    donorName: row.donorName ? String(row.donorName) : "",
    mobileNumber: row.mobileNumber ? String(row.mobileNumber) : "",
    email: row.email ? String(row.email) : "",
    note: row.note ? String(row.note) : "",
    status: String(row.status || "PLEDGED"),
    createdAt: toIsoDateTime(row.createdAt),
  }
}
