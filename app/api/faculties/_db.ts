import { dbQuery } from "@/lib/db"

export type DbFacultyRow = {
  id: string
  facultyId: string
  name: string
  department: string | null
  createdAt?: string
  updatedAt?: string
}

async function columnExists(columnName: string): Promise<boolean> {
  const rows = await dbQuery<any>(
    "SELECT COUNT(*) as total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'academic_module_faculties' AND COLUMN_NAME = ?",
    [columnName],
  )
  return Number(rows?.[0]?.total || 0) > 0
}

export async function ensureFacultiesTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_faculties (
      id VARCHAR(36) PRIMARY KEY,
      facultyId VARCHAR(50) NOT NULL,
      name VARCHAR(150) NOT NULL,
      department VARCHAR(150) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_facultyId (facultyId),
      INDEX idx_name (name),
      INDEX idx_department (department)
    ) ENGINE=InnoDB`,
    [],
  )

  // Backfill columns for older schemas.
  if (!(await columnExists("facultyId"))) {
    await dbQuery("ALTER TABLE academic_module_faculties ADD COLUMN facultyId VARCHAR(50) NOT NULL", [])
    await dbQuery("ALTER TABLE academic_module_faculties ADD UNIQUE KEY uniq_facultyId (facultyId)", [])
  }
  if (!(await columnExists("name"))) {
    await dbQuery("ALTER TABLE academic_module_faculties ADD COLUMN name VARCHAR(150) NOT NULL", [])
    await dbQuery("ALTER TABLE academic_module_faculties ADD INDEX idx_name (name)", [])
  }
  if (!(await columnExists("department"))) {
    await dbQuery("ALTER TABLE academic_module_faculties ADD COLUMN department VARCHAR(150) NULL", [])
    await dbQuery("ALTER TABLE academic_module_faculties ADD INDEX idx_department (department)", [])
  }
}
