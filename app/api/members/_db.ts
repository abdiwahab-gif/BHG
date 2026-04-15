import { dbQuery } from "@/lib/db"

export type DbMemberRow = {
  id: string
  fullName: string
  gender: string | null
  mobileNumber: string
  email: string
  deggen: string
  shaqada: string
  masuulkaaga: string
  photo: string | null
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

export async function ensureMembersTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_members (
      id VARCHAR(36) PRIMARY KEY,
      sequence BIGINT NOT NULL AUTO_INCREMENT UNIQUE,

      fullName VARCHAR(255) NOT NULL,
      gender VARCHAR(10) NULL,
      mobileNumber VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL,
      deggen VARCHAR(255) NOT NULL,
      shaqada VARCHAR(150) NOT NULL,
      masuulkaaga VARCHAR(255) NOT NULL,

      photo MEDIUMTEXT NULL,

      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      UNIQUE KEY uniq_member_email (email),
      INDEX idx_member_mobile (mobileNumber),
      INDEX idx_member_fullName (fullName),
      INDEX idx_member_createdAt (createdAt)
    ) ENGINE=InnoDB`,
    [],
  )

  // Backfill photo column if the table existed previously.
  if (!(await columnExists("academic_module_members", "photo"))) {
    await dbQuery("ALTER TABLE academic_module_members ADD COLUMN photo MEDIUMTEXT NULL", [])
  }

  // Backfill gender column if the table existed previously.
  if (!(await columnExists("academic_module_members", "gender"))) {
    await dbQuery("ALTER TABLE academic_module_members ADD COLUMN gender VARCHAR(10) NULL AFTER fullName", [])
  }
}

function toIsoDateTime(value: unknown): string {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toISOString()
}

export function toMemberDto(row: DbMemberRow) {
  return {
    id: String(row.id),
    fullName: String(row.fullName),
    gender: row.gender ? String(row.gender) : "",
    mobileNumber: String(row.mobileNumber),
    email: String(row.email),
    deggen: String(row.deggen),
    shaqada: String(row.shaqada),
    masuulkaaga: String(row.masuulkaaga),
    photo: row.photo ? String(row.photo) : "",
    createdAt: toIsoDateTime(row.createdAt),
    updatedAt: toIsoDateTime(row.updatedAt),
  }
}
