import crypto from "crypto"
import type { RowDataPacket } from "mysql2/promise"
import { dbQuery } from "@/lib/db"

export async function ensureHREmployeesTable(): Promise<void> {
  const createSql = `CREATE TABLE IF NOT EXISTS hr_employees (
      id VARCHAR(36) PRIMARY KEY,
      sequence BIGINT NOT NULL AUTO_INCREMENT UNIQUE,

      employeeId VARCHAR(50) NULL,
      biometricUserId VARCHAR(50) NULL,

      firstName VARCHAR(100) NOT NULL,
      lastName VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NULL,

      department VARCHAR(100) NULL,
      position VARCHAR(100) NULL,
      employeeType VARCHAR(30) NOT NULL DEFAULT 'full-time',
      employmentStatus VARCHAR(30) NOT NULL DEFAULT 'active',
      hireDate DATE NULL,

      salary DECIMAL(12,2) NOT NULL DEFAULT 0,
      salaryType VARCHAR(20) NOT NULL DEFAULT 'monthly',
      currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      payGrade VARCHAR(30) NULL,

      workLocation VARCHAR(100) NULL,
      timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',

      dateOfBirth DATE NULL,
      gender VARCHAR(10) NOT NULL DEFAULT 'other',
      maritalStatus VARCHAR(15) NOT NULL DEFAULT 'single',
      nationality VARCHAR(100) NULL,

      addressJson JSON NULL,
      emergencyContactJson JSON NULL,
      workScheduleJson JSON NULL,
      benefitsJson JSON NULL,
      skillsJson JSON NULL,
      educationJson JSON NULL,
      certificationsJson JSON NULL,
      languagesJson JSON NULL,

      createdBy VARCHAR(255) NOT NULL DEFAULT 'system',
      isActive BOOLEAN NOT NULL DEFAULT TRUE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      UNIQUE KEY uniq_email (email),
      UNIQUE KEY uniq_employeeId (employeeId),
      INDEX idx_department (department),
      INDEX idx_status (employmentStatus),
      INDEX idx_isActive (isActive),
      INDEX idx_biometricUserId (biometricUserId)
    ) ENGINE=InnoDB`

  await dbQuery(createSql, [])

  type ExistsRow = RowDataPacket & { c: number }
  const colRows = await dbQuery<RowDataPacket & { column_name: string }>(
    `SELECT LOWER(COLUMN_NAME) as column_name
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_employees'`,
    [],
  )
  const cols = new Set((colRows || []).map((r) => String((r as any).column_name).toLowerCase()))

  const requiredColumns = [
    "sequence",
    "employeeid",
    "biometricuserid",
    "firstname",
    "lastname",
    "email",
    "phone",
    "department",
    "position",
    "employeetype",
    "employmentstatus",
    "hiredate",
    "salary",
    "salarytype",
    "currency",
    "paygrade",
    "worklocation",
    "timezone",
    "dateofbirth",
    "gender",
    "maritalstatus",
    "nationality",
    "addressjson",
    "emergencycontactjson",
    "workschedulejson",
    "benefitsjson",
    "skillsjson",
    "educationjson",
    "certificationsjson",
    "languagesjson",
    "createdby",
    "isactive",
    "createdat",
    "updatedat",
  ]

  const missing = requiredColumns.filter((c) => !cols.has(c))
  if (missing.length === 0) return

  const countRows = await dbQuery<ExistsRow>("SELECT COUNT(*) as c FROM hr_employees", [])
  const rowCount = Number(countRows?.[0]?.c ?? 0)
  if (rowCount === 0) {
    await dbQuery("DROP TABLE hr_employees", [])
    await dbQuery(createSql, [])
    return
  }

  // Non-empty: additive migrations only (avoid destructive schema changes).
  const addIfMissing = async (col: string, sql: string) => {
    if (cols.has(col)) return
    await dbQuery(sql, [])
  }

  await addIfMissing("employeeid", "ALTER TABLE hr_employees ADD COLUMN employeeId VARCHAR(50) NULL")
  await addIfMissing("biometricuserid", "ALTER TABLE hr_employees ADD COLUMN biometricUserId VARCHAR(50) NULL")
  await addIfMissing("firstname", "ALTER TABLE hr_employees ADD COLUMN firstName VARCHAR(100) NULL")
  await addIfMissing("lastname", "ALTER TABLE hr_employees ADD COLUMN lastName VARCHAR(100) NULL")
  await addIfMissing("email", "ALTER TABLE hr_employees ADD COLUMN email VARCHAR(255) NULL")
  await addIfMissing("phone", "ALTER TABLE hr_employees ADD COLUMN phone VARCHAR(50) NULL")
  await addIfMissing("department", "ALTER TABLE hr_employees ADD COLUMN department VARCHAR(100) NULL")
  await addIfMissing("position", "ALTER TABLE hr_employees ADD COLUMN position VARCHAR(100) NULL")
  await addIfMissing("employeetype", "ALTER TABLE hr_employees ADD COLUMN employeeType VARCHAR(30) NOT NULL DEFAULT 'full-time'")
  if (!cols.has("employmentstatus")) {
    await dbQuery("ALTER TABLE hr_employees ADD COLUMN employmentStatus VARCHAR(30) NOT NULL DEFAULT 'active'", [])
    if (cols.has("status")) {
      await dbQuery("UPDATE hr_employees SET employmentStatus = status WHERE employmentStatus IS NULL OR employmentStatus = ''", [])
    }
  }
  if (!cols.has("hiredate")) {
    await dbQuery("ALTER TABLE hr_employees ADD COLUMN hireDate DATE NULL", [])
    if (cols.has("joindate")) {
      await dbQuery("UPDATE hr_employees SET hireDate = joinDate WHERE hireDate IS NULL", [])
    }
  }
  await addIfMissing("salary", "ALTER TABLE hr_employees ADD COLUMN salary DECIMAL(12,2) NOT NULL DEFAULT 0")
  await addIfMissing("salarytype", "ALTER TABLE hr_employees ADD COLUMN salaryType VARCHAR(20) NOT NULL DEFAULT 'monthly'")
  await addIfMissing("currency", "ALTER TABLE hr_employees ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'USD'")
  await addIfMissing("paygrade", "ALTER TABLE hr_employees ADD COLUMN payGrade VARCHAR(30) NULL")
  await addIfMissing("worklocation", "ALTER TABLE hr_employees ADD COLUMN workLocation VARCHAR(100) NULL")
  await addIfMissing("timezone", "ALTER TABLE hr_employees ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'UTC'")
  await addIfMissing("dateofbirth", "ALTER TABLE hr_employees ADD COLUMN dateOfBirth DATE NULL")
  await addIfMissing("gender", "ALTER TABLE hr_employees ADD COLUMN gender VARCHAR(10) NOT NULL DEFAULT 'other'")
  await addIfMissing("maritalstatus", "ALTER TABLE hr_employees ADD COLUMN maritalStatus VARCHAR(15) NOT NULL DEFAULT 'single'")
  await addIfMissing("nationality", "ALTER TABLE hr_employees ADD COLUMN nationality VARCHAR(100) NULL")
  await addIfMissing("addressjson", "ALTER TABLE hr_employees ADD COLUMN addressJson JSON NULL")
  await addIfMissing("emergencycontactjson", "ALTER TABLE hr_employees ADD COLUMN emergencyContactJson JSON NULL")
  await addIfMissing("workschedulejson", "ALTER TABLE hr_employees ADD COLUMN workScheduleJson JSON NULL")
  await addIfMissing("benefitsjson", "ALTER TABLE hr_employees ADD COLUMN benefitsJson JSON NULL")
  await addIfMissing("skillsjson", "ALTER TABLE hr_employees ADD COLUMN skillsJson JSON NULL")
  await addIfMissing("educationjson", "ALTER TABLE hr_employees ADD COLUMN educationJson JSON NULL")
  await addIfMissing("certificationsjson", "ALTER TABLE hr_employees ADD COLUMN certificationsJson JSON NULL")
  await addIfMissing("languagesjson", "ALTER TABLE hr_employees ADD COLUMN languagesJson JSON NULL")
  await addIfMissing("createdby", "ALTER TABLE hr_employees ADD COLUMN createdBy VARCHAR(255) NOT NULL DEFAULT 'system'")
  await addIfMissing("isactive", "ALTER TABLE hr_employees ADD COLUMN isActive BOOLEAN NOT NULL DEFAULT TRUE")
  await addIfMissing(
    "createdat",
    "ALTER TABLE hr_employees ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
  )
  await addIfMissing(
    "updatedat",
    "ALTER TABLE hr_employees ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
  )

  if (!cols.has("sequence")) {
    // Add sequence for deterministic EMP-#### codes.
    try {
      await dbQuery("ALTER TABLE hr_employees ADD COLUMN sequence BIGINT NOT NULL AUTO_INCREMENT", [])
      await dbQuery("ALTER TABLE hr_employees ADD UNIQUE KEY uniq_sequence (sequence)", [])
    } catch {
      // As a last resort, add a nullable sequence so SELECTs don't fail.
      await dbQuery("ALTER TABLE hr_employees ADD COLUMN sequence BIGINT NULL", [])
    }
  }
}

export async function ensureHRLeaveTables(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS hr_leave_types (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT NULL,
      maxDaysPerYear INT NOT NULL DEFAULT 0,
      carryForward BOOLEAN NOT NULL DEFAULT FALSE,
      maxCarryForwardDays INT NOT NULL DEFAULT 0,
      requiresApproval BOOLEAN NOT NULL DEFAULT TRUE,
      approverLevels INT NOT NULL DEFAULT 1,
      isPaid BOOLEAN NOT NULL DEFAULT TRUE,
      minimumNotice INT NOT NULL DEFAULT 0,
      isActive BOOLEAN NOT NULL DEFAULT TRUE,
      color VARCHAR(20) NOT NULL DEFAULT '#64748b',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_name (name),
      INDEX idx_isActive (isActive)
    ) ENGINE=InnoDB`,
    [],
  )

  await dbQuery(
    `CREATE TABLE IF NOT EXISTS hr_leave_requests (
      id VARCHAR(36) PRIMARY KEY,
      employeeId VARCHAR(50) NOT NULL,
      leaveTypeId VARCHAR(36) NOT NULL,
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      totalDays INT NOT NULL,
      reason TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      appliedDate DATETIME NOT NULL,
      reviewedDate DATETIME NULL,
      reviewedBy VARCHAR(50) NULL,
      reviewerComments TEXT NULL,
      documentsJson JSON NULL,
      isEmergency BOOLEAN NOT NULL DEFAULT FALSE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_employeeId (employeeId),
      INDEX idx_leaveTypeId (leaveTypeId),
      INDEX idx_status (status),
      INDEX idx_start_end (startDate, endDate)
    ) ENGINE=InnoDB`,
    [],
  )
}

export async function ensureHRAttendanceTables(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS hr_attendance_events (
      id VARCHAR(36) PRIMARY KEY,
      employeeId VARCHAR(50) NOT NULL,
      eventTime DATETIME NOT NULL,
      eventType VARCHAR(30) NOT NULL DEFAULT '',
      location VARCHAR(100) NOT NULL DEFAULT 'Office',
      notes TEXT NULL,
      source VARCHAR(20) NOT NULL DEFAULT 'manual',
      deviceId VARCHAR(36) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_event (employeeId, eventTime, eventType),
      INDEX idx_employee_time (employeeId, eventTime),
      INDEX idx_eventTime (eventTime),
      INDEX idx_source (source),
      INDEX idx_deviceId (deviceId)
    ) ENGINE=InnoDB`,
    [],
  )
}

export async function ensureHRBiometricTables(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS hr_biometric_devices (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      vendor VARCHAR(50) NOT NULL DEFAULT 'unknown',
      model VARCHAR(100) NULL,
      ip VARCHAR(64) NOT NULL,
      port INT NOT NULL DEFAULT 4370,
      timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
      isActive BOOLEAN NOT NULL DEFAULT TRUE,
      lastSyncAt DATETIME NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_ip_port (ip, port),
      INDEX idx_isActive (isActive)
    ) ENGINE=InnoDB`,
    [],
  )

  await dbQuery(
    `CREATE TABLE IF NOT EXISTS hr_biometric_logs (
      id VARCHAR(36) PRIMARY KEY,
      deviceId VARCHAR(36) NOT NULL,
      deviceUserId VARCHAR(50) NOT NULL,
      eventTime DATETIME NOT NULL,
      eventType VARCHAR(30) NOT NULL DEFAULT '',
      rawJson JSON NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_device_event (deviceId, deviceUserId, eventTime, eventType),
      INDEX idx_device_time (deviceId, eventTime),
      INDEX idx_deviceUserId (deviceUserId)
    ) ENGINE=InnoDB`,
    [],
  )
}

export async function ensureHRSeedData(): Promise<void> {
  type CountRow = RowDataPacket & { c: number }
  const rows = await dbQuery<CountRow>("SELECT COUNT(*) as c FROM hr_leave_types", [])
  const c = Number(rows?.[0]?.c ?? 0)
  if (c > 0) return

  const seed = [
    {
      id: crypto.randomUUID(),
      name: "Annual Leave",
      description: "Yearly vacation days",
      maxDaysPerYear: 21,
      carryForward: 1,
      maxCarryForwardDays: 5,
      requiresApproval: 1,
      approverLevels: 1,
      isPaid: 1,
      minimumNotice: 7,
      isActive: 1,
      color: "#f59e0b",
    },
    {
      id: crypto.randomUUID(),
      name: "Sick Leave",
      description: "Medical leave",
      maxDaysPerYear: 10,
      carryForward: 0,
      maxCarryForwardDays: 0,
      requiresApproval: 0,
      approverLevels: 0,
      isPaid: 1,
      minimumNotice: 0,
      isActive: 1,
      color: "#ef4444",
    },
    {
      id: crypto.randomUUID(),
      name: "Personal Leave",
      description: "Personal time off",
      maxDaysPerYear: 5,
      carryForward: 0,
      maxCarryForwardDays: 0,
      requiresApproval: 1,
      approverLevels: 1,
      isPaid: 0,
      minimumNotice: 3,
      isActive: 1,
      color: "#3b82f6",
    },
  ]

  for (const t of seed) {
    await dbQuery(
      `INSERT INTO hr_leave_types (
         id, name, description, maxDaysPerYear, carryForward, maxCarryForwardDays,
         requiresApproval, approverLevels, isPaid, minimumNotice, isActive, color
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ,
      [
        t.id,
        t.name,
        t.description,
        t.maxDaysPerYear,
        t.carryForward,
        t.maxCarryForwardDays,
        t.requiresApproval,
        t.approverLevels,
        t.isPaid,
        t.minimumNotice,
        t.isActive,
        t.color,
      ],
    )
  }
}

export async function ensureHRAllTables(): Promise<void> {
  await ensureHREmployeesTable()
  await ensureHRLeaveTables()
  await ensureHRAttendanceTables()
  await ensureHRBiometricTables()
  await ensureHRSeedData()
}
