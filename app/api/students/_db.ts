import { dbQuery } from "@/lib/db"

export type StudentsPhysicalTableName = "students" | "academic_module_students"

async function getTableType(tableName: StudentsPhysicalTableName): Promise<"BASE TABLE" | "VIEW" | ""> {
  const rows = await dbQuery<any>(
    "SELECT TABLE_TYPE as tableType FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1",
    [tableName],
  )
  const tableType = String(rows?.[0]?.tableType || "").toUpperCase()
  if (tableType === "VIEW") return "VIEW"
  if (tableType === "BASE TABLE") return "BASE TABLE"
  return ""
}

async function tableExists(tableName: StudentsPhysicalTableName): Promise<boolean> {
  return Boolean(await getTableType(tableName))
}

export async function resolveStudentsPhysicalTableName(): Promise<StudentsPhysicalTableName> {
  const academicType = await getTableType("academic_module_students")
  if (academicType === "VIEW") {
    // Only assume legacy underlying table name if it actually exists.
    return (await tableExists("students")) ? "students" : "academic_module_students"
  }
  return "academic_module_students"
}

function assertStudentsPhysicalTableName(value: string): asserts value is "students" | "academic_module_students" {
  if (value !== "students" && value !== "academic_module_students") {
    throw new Error(`Unexpected students table name: ${value}`)
  }
}

export type DbStudentRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  className: string
  sectionName: string
  program?: string | null
  faculty?: string | null
  department?: string | null
  photo: string | null
  status: "active" | "inactive" | "suspended" | string
  gender: "male" | "female" | "other" | string
  enrollmentDate: string
  studentId: string
  bloodType: string
  nationality: string
  religion: string
  address: string
  address2: string | null
  city: string
  zip: string
  fatherName: string
  motherName: string
  fatherPhone: string
  motherPhone: string
  fatherOccupation: string | null
  motherOccupation: string | null
  fatherEmail: string | null
  motherEmail: string | null
  emergencyContact: string
  medicalConditions: string | null
  allergies: string | null
  previousSchool: string | null
  transferReason: string | null
  birthday: string | null
  idCardNumber: string | null
  boardRegistrationNo: string | null
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

async function uniqueIndexExists(tableName: string, columnName: string): Promise<boolean> {
  const rows = await dbQuery<any>(
    "SELECT COUNT(*) as total FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND NON_UNIQUE = 0",
    [tableName, columnName],
  )
  return Number(rows?.[0]?.total || 0) > 0
}

async function hasDuplicateNonEmptyValues(tableName: string, columnName: string): Promise<boolean> {
  const rows = await dbQuery<any>(
    `SELECT ${columnName} as value, COUNT(*) as total
     FROM ${tableName}
     WHERE ${columnName} IS NOT NULL AND ${columnName} <> ''
     GROUP BY ${columnName}
     HAVING total > 1
     LIMIT 1`,
    [],
  )
  return Array.isArray(rows) && rows.length > 0
}

export async function ensureStudentsTable(): Promise<void> {
  // Avoid failing on databases where academic_module_students is a VIEW.
  // Also avoid DEFAULT(CURRENT_DATE) for DATE columns, which can fail to parse on older MySQL/MariaDB.
  const academicType = await getTableType("academic_module_students")

  if (!academicType) {
    await dbQuery(
      `CREATE TABLE IF NOT EXISTS academic_module_students (
      id VARCHAR(36) PRIMARY KEY,
      sequence BIGINT NOT NULL AUTO_INCREMENT UNIQUE,

      firstName VARCHAR(100) NOT NULL,
      lastName VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      passwordHash VARCHAR(255) NULL,
      birthday DATE NULL,

      phone VARCHAR(50) NOT NULL,
      className VARCHAR(100) NOT NULL,
      sectionName VARCHAR(100) NOT NULL,
      program VARCHAR(150) NULL,
      faculty VARCHAR(150) NULL,
      department VARCHAR(150) NULL,
      gender VARCHAR(20) NOT NULL,

      bloodType VARCHAR(10) NOT NULL,
      nationality VARCHAR(100) NOT NULL,
      religion VARCHAR(50) NOT NULL,

      address VARCHAR(255) NOT NULL,
      address2 VARCHAR(255) NULL,
      city VARCHAR(100) NOT NULL,
      zip VARCHAR(20) NOT NULL,

      idCardNumber VARCHAR(50) NULL,
      boardRegistrationNo VARCHAR(50) NULL,

      fatherName VARCHAR(100) NOT NULL,
      motherName VARCHAR(100) NOT NULL,
      fatherPhone VARCHAR(50) NOT NULL,
      motherPhone VARCHAR(50) NOT NULL,
      fatherOccupation VARCHAR(100) NULL,
      motherOccupation VARCHAR(100) NULL,
      fatherEmail VARCHAR(255) NULL,
      motherEmail VARCHAR(255) NULL,

      emergencyContact VARCHAR(50) NOT NULL,
      medicalConditions TEXT NULL,
      allergies TEXT NULL,
      previousSchool VARCHAR(255) NULL,
      transferReason TEXT NULL,

      studentId VARCHAR(64) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      enrollmentDate DATE NOT NULL,
      photo MEDIUMTEXT NULL,

      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      UNIQUE KEY uniq_email (email),
      UNIQUE KEY uniq_studentId (studentId),
      UNIQUE KEY uniq_idCardNumber (idCardNumber),
      INDEX idx_status (status),
      INDEX idx_class_section (className, sectionName),
      INDEX idx_name (lastName, firstName)
    ) ENGINE=InnoDB`,
      [],
    )
  }

  // If academic_module_students is a VIEW, we can't ALTER it safely here.
  // Still allow reads from the view; write paths will resolve a base table separately.
  if (academicType === "VIEW") {
    return
  }

  const physicalTable: StudentsPhysicalTableName = "academic_module_students"

  // Ensure photo supports base64 data URLs if schema existed previously.
  const photoTypeRows = await dbQuery<any>(
    "SELECT DATA_TYPE as dataType FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'photo' LIMIT 1",
    [physicalTable],
  )

  const dataType = String(photoTypeRows?.[0]?.dataType || "").toLowerCase()
  if (dataType && dataType !== "mediumtext") {
    assertStudentsPhysicalTableName(physicalTable)
    await dbQuery(`ALTER TABLE ${physicalTable} MODIFY COLUMN photo MEDIUMTEXT NULL`, []).catch(() => undefined)
  }

  // Backfill optional metadata columns for imports/integrations.
  assertStudentsPhysicalTableName(physicalTable)
  if (!(await columnExists(physicalTable, "program"))) {
    await dbQuery(`ALTER TABLE ${physicalTable} ADD COLUMN program VARCHAR(150) NULL`, []).catch(() => undefined)
  }
  if (!(await columnExists(physicalTable, "faculty"))) {
    await dbQuery(`ALTER TABLE ${physicalTable} ADD COLUMN faculty VARCHAR(150) NULL`, []).catch(() => undefined)
  }
  if (!(await columnExists(physicalTable, "department"))) {
    await dbQuery(`ALTER TABLE ${physicalTable} ADD COLUMN department VARCHAR(150) NULL`, []).catch(() => undefined)
  }

  // Enforce unique idCardNumber when it's safe to do so (unique indexes allow multiple NULLs).
  // If duplicates already exist, keep working and rely on API-level validation.
  try {
    const hasUnique = await uniqueIndexExists(physicalTable, "idCardNumber")
    if (!hasUnique) {
      const hasDuplicates = await hasDuplicateNonEmptyValues(physicalTable, "idCardNumber")
      if (!hasDuplicates) {
        await dbQuery(`ALTER TABLE ${physicalTable} ADD UNIQUE KEY uniq_idCardNumber (idCardNumber)`, [])
      }
    }
  } catch {
    // Ignore - keep API operational.
  }
}

function toIsoDate(value: unknown): string {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toISOString().slice(0, 10)
}

function toIsoDateTime(value: unknown): string {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toISOString()
}

export function generateStudentIdFromSequence(className: string, sectionName: string, sequence: number): string {
  const year = new Date().getFullYear()
  const classNumber = String(className || "").replace(/^Class\s+/i, "").trim() || "X"
  const sectionLetter = String(sectionName || "").replace(/^Section\s+/i, "").trim() || "X"
  const sequenceStr = String(sequence).padStart(3, "0")
  return `${year}-${classNumber}-${sectionLetter}-${sequenceStr}`
}

export function toStudentDto(row: DbStudentRow) {
  return {
    id: String(row.id),
    firstName: String(row.firstName),
    lastName: String(row.lastName),
    email: String(row.email),
    phone: String(row.phone),
    class: String(row.className),
    section: String(row.sectionName),
    photo: row.photo ? String(row.photo) : "",
    status: row.status === "active" || row.status === "inactive" || row.status === "suspended" ? row.status : "active",
    gender: row.gender === "male" || row.gender === "female" || row.gender === "other" ? row.gender : "other",
    enrollmentDate: toIsoDate(row.enrollmentDate),
    studentId: String(row.studentId),
    bloodType: String(row.bloodType),
    nationality: String(row.nationality),
    religion: String(row.religion),
    address: String(row.address),
    address2: row.address2 ? String(row.address2) : "",
    city: String(row.city),
    zip: String(row.zip),
    fatherName: String(row.fatherName),
    motherName: String(row.motherName),
    fatherPhone: String(row.fatherPhone),
    motherPhone: String(row.motherPhone),
    fatherOccupation: row.fatherOccupation ? String(row.fatherOccupation) : "",
    motherOccupation: row.motherOccupation ? String(row.motherOccupation) : "",
    fatherEmail: row.fatherEmail ? String(row.fatherEmail) : "",
    motherEmail: row.motherEmail ? String(row.motherEmail) : "",
    emergencyContact: String(row.emergencyContact),
    medicalConditions: row.medicalConditions ? String(row.medicalConditions) : "",
    allergies: row.allergies ? String(row.allergies) : "",
    previousSchool: row.previousSchool ? String(row.previousSchool) : "",
    transferReason: row.transferReason ? String(row.transferReason) : "",
    createdAt: toIsoDateTime(row.createdAt),
    updatedAt: toIsoDateTime(row.updatedAt),

    // Optional metadata (non-breaking additions)
    program: row.program ? String(row.program) : "",
    faculty: row.faculty ? String(row.faculty) : "",
    department: row.department ? String(row.department) : "",

    // Extra fields that some pages/forms send; kept for compatibility.
    birthday: row.birthday ? toIsoDate(row.birthday) : "",
    idCardNumber: row.idCardNumber ? String(row.idCardNumber) : "",
    boardRegistrationNo: row.boardRegistrationNo ? String(row.boardRegistrationNo) : "",
  }
}
