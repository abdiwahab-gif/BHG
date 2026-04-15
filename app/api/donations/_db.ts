import { dbQuery } from "@/lib/db"

export type DbDonationRow = {
  id: string
  createdById?: string | null
  amount: string | number
  donorName: string | null
  mobileNumber: string | null
  email: string | null
  note: string | null
  status: string
  createdAt: string
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const rows = await dbQuery<any>(
    "SELECT COUNT(*) as total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [tableName, columnName],
  )
  return Number(rows?.[0]?.total || 0) > 0
}

export async function ensureDonationsTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_donations (
      id VARCHAR(36) PRIMARY KEY,
      createdById VARCHAR(36) NULL,
      amount DECIMAL(12,2) NOT NULL,
      donorName VARCHAR(255) NULL,
      mobileNumber VARCHAR(50) NULL,
      email VARCHAR(255) NULL,
      note TEXT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PLEDGED',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_donation_createdAt (createdAt),
      INDEX idx_donation_status (status),
      INDEX idx_donation_createdById (createdById)
    ) ENGINE=InnoDB`,
    [],
  )

  if (!(await columnExists("academic_module_donations", "createdById"))) {
    await dbQuery("ALTER TABLE academic_module_donations ADD COLUMN createdById VARCHAR(36) NULL AFTER id", [])
    await dbQuery("CREATE INDEX idx_donation_createdById ON academic_module_donations (createdById)", [])
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
