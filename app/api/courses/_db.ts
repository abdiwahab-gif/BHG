import { dbQuery } from "@/lib/db"

async function resolveCoursesPhysicalTableName(): Promise<string> {
  const rows = await dbQuery<any>(
    "SELECT TABLE_TYPE as tableType FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'academic_module_courses' LIMIT 1",
    [],
  )
  const tableType = String(rows?.[0]?.tableType || "").toUpperCase()
  return tableType === "VIEW" ? "courses" : "academic_module_courses"
}

function assertCoursesPhysicalTableName(value: string): asserts value is "courses" | "academic_module_courses" {
  if (value !== "courses" && value !== "academic_module_courses") {
    throw new Error(`Unexpected courses table name: ${value}`)
  }
}

export type DbCourseRow = {
  id: string
  name: string
  type: string
  code: string | null
  credits: number | null
  faculty: string | null
  department: string | null
  createdAt?: string
  updatedAt?: string
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const rows = await dbQuery<any>(
    "SELECT COUNT(*) as total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [tableName, columnName],
  )
  return Number(rows?.[0]?.total || 0) > 0
}

export async function ensureCoursesTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_courses (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL,
      code VARCHAR(30) NULL,
      credits DECIMAL(4,2) NULL,
      faculty VARCHAR(100) NULL,
      department VARCHAR(100) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_type (type),
      INDEX idx_name (name),
      INDEX idx_code (code),
      INDEX idx_department (department)
    ) ENGINE=InnoDB`,
    [],
  )

  const physicalTable = await resolveCoursesPhysicalTableName()
  assertCoursesPhysicalTableName(physicalTable)

  // Backfill columns for older schemas.
  if (!(await columnExists(physicalTable, "code"))) {
    await dbQuery(`ALTER TABLE ${physicalTable} ADD COLUMN code VARCHAR(30) NULL`, [])
    await dbQuery(`ALTER TABLE ${physicalTable} ADD INDEX idx_code (code)`, [])
  }
  if (!(await columnExists(physicalTable, "credits"))) {
    await dbQuery(`ALTER TABLE ${physicalTable} ADD COLUMN credits DECIMAL(4,2) NULL`, [])
  }
  if (!(await columnExists(physicalTable, "faculty"))) {
    await dbQuery(`ALTER TABLE ${physicalTable} ADD COLUMN faculty VARCHAR(100) NULL`, [])
  }
  if (!(await columnExists(physicalTable, "department"))) {
    await dbQuery(`ALTER TABLE ${physicalTable} ADD COLUMN department VARCHAR(100) NULL`, [])
    await dbQuery(`ALTER TABLE ${physicalTable} ADD INDEX idx_department (department)`, [])
  }
}
