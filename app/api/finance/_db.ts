import { getDbPool } from "@/lib/db"

type ColumnRow = { COLUMN_NAME: string }

export async function ensureFinanceCoreTables(): Promise<void> {
  const pool = getDbPool()
  const ddl = async (sql: string) => {
    await pool.query(sql)
  }

  const getColumnNames = async (tableName: string): Promise<Set<string>> => {
    const [rows] = await pool.query<ColumnRow[]>(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
      [tableName],
    )
    return new Set((rows || []).map((r) => String(r.COLUMN_NAME)))
  }

  const addColumnIfMissing = async (tableName: string, columnName: string, addSql: string) => {
    const cols = await getColumnNames(tableName)
    if (!cols.has(columnName)) {
      await ddl(`ALTER TABLE ${tableName} ADD COLUMN ${addSql}`)
    }
  }

  await ddl(
    `CREATE TABLE IF NOT EXISTS gl_accounts (
      id VARCHAR(36) PRIMARY KEY,
      accountCode VARCHAR(30) NOT NULL,
      accountName VARCHAR(255) NOT NULL,
      accountType VARCHAR(20) NOT NULL,
      accountSubType VARCHAR(100) NOT NULL DEFAULT '',
      parentAccountId VARCHAR(36) NULL,
      description TEXT NULL,
      taxLineMapping VARCHAR(255) NULL,
      isActive BOOLEAN NOT NULL DEFAULT TRUE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_accountCode (accountCode),
      INDEX idx_type (accountType),
      INDEX idx_isActive (isActive),
      INDEX idx_parent (parentAccountId)
    ) ENGINE=InnoDB`,
  )

  await ddl(
    `CREATE TABLE IF NOT EXISTS gl_journal_entry_sequences (
      seqYear INT NOT NULL,
      nextNumber INT NOT NULL DEFAULT 0,
      PRIMARY KEY (seqYear)
    ) ENGINE=InnoDB`,
  )

  // Backward-compatible migration: earlier versions used different column names.
  // CREATE TABLE IF NOT EXISTS won't fix existing tables, so we normalize here.
  try {
    const seqCols = await getColumnNames("gl_journal_entry_sequences")
    if (!seqCols.has("seqYear")) {
      if (seqCols.has("year")) {
        await ddl("ALTER TABLE gl_journal_entry_sequences CHANGE COLUMN year seqYear INT NOT NULL")
      } else if (seqCols.has("seq_year")) {
        await ddl("ALTER TABLE gl_journal_entry_sequences CHANGE COLUMN seq_year seqYear INT NOT NULL")
      }
    }
    const seqCols2 = await getColumnNames("gl_journal_entry_sequences")
    if (!seqCols2.has("nextNumber")) {
      if (seqCols2.has("next_number")) {
        await ddl("ALTER TABLE gl_journal_entry_sequences CHANGE COLUMN next_number nextNumber INT NOT NULL DEFAULT 0")
      } else {
        await ddl("ALTER TABLE gl_journal_entry_sequences ADD COLUMN nextNumber INT NOT NULL DEFAULT 0")
      }
    }
  } catch {
    // Ignore: if the DB user lacks ALTER privileges or the table is absent.
    // Writes will surface a clear API error and guide the operator.
  }

  await ddl(
    `CREATE TABLE IF NOT EXISTS gl_journal_entries (
      id VARCHAR(36) PRIMARY KEY,
      entryNumber VARCHAR(30) NOT NULL,
      entryDate DATE NOT NULL,
      description TEXT NOT NULL,
      reference VARCHAR(100) NULL,
      entryType VARCHAR(20) NOT NULL DEFAULT 'GENERAL',
      status VARCHAR(20) NOT NULL DEFAULT 'POSTED',
      totalDebit DECIMAL(18,2) NOT NULL DEFAULT 0,
      totalCredit DECIMAL(18,2) NOT NULL DEFAULT 0,
      createdBy VARCHAR(255) NOT NULL DEFAULT 'system',
      createdById VARCHAR(36) NOT NULL DEFAULT 'system',
      approvedBy VARCHAR(255) NULL,
      approvedById VARCHAR(36) NULL,
      approvedAt DATETIME NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_entryNumber (entryNumber),
      INDEX idx_entryDate (entryDate),
      INDEX idx_entryType (entryType),
      INDEX idx_status (status)
    ) ENGINE=InnoDB`,
  )

  // Backward-compatible migration: ensure journal entry columns exist.
  try {
    await addColumnIfMissing(
      "gl_journal_entries",
      "entryType",
      "entryType VARCHAR(20) NOT NULL DEFAULT 'GENERAL'",
    )
    await addColumnIfMissing("gl_journal_entries", "status", "status VARCHAR(20) NOT NULL DEFAULT 'POSTED'")
    await addColumnIfMissing(
      "gl_journal_entries",
      "totalDebit",
      "totalDebit DECIMAL(18,2) NOT NULL DEFAULT 0",
    )
    await addColumnIfMissing(
      "gl_journal_entries",
      "totalCredit",
      "totalCredit DECIMAL(18,2) NOT NULL DEFAULT 0",
    )
    await addColumnIfMissing(
      "gl_journal_entries",
      "createdBy",
      "createdBy VARCHAR(255) NOT NULL DEFAULT 'system'",
    )
    await addColumnIfMissing(
      "gl_journal_entries",
      "createdById",
      "createdById VARCHAR(36) NOT NULL DEFAULT 'system'",
    )
  } catch {
    // Ignore: see note above.
  }

  await ddl(
    `CREATE TABLE IF NOT EXISTS gl_journal_lines (
      id VARCHAR(36) PRIMARY KEY,
      journalEntryId VARCHAR(36) NOT NULL,
      accountId VARCHAR(36) NOT NULL,
      description TEXT NOT NULL,
      debitAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
      creditAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
      lineNumber INT NOT NULL,
      dimensionSetId VARCHAR(36) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_journalEntryId (journalEntryId),
      INDEX idx_accountId (accountId),
      INDEX idx_dimensionSetId (dimensionSetId)
    ) ENGINE=InnoDB`,
  )

  // Backward-compatible migration: ensure journal line columns exist.
  try {
    await addColumnIfMissing(
      "gl_journal_lines",
      "debitAmount",
      "debitAmount DECIMAL(18,2) NOT NULL DEFAULT 0",
    )
    await addColumnIfMissing(
      "gl_journal_lines",
      "creditAmount",
      "creditAmount DECIMAL(18,2) NOT NULL DEFAULT 0",
    )
    await addColumnIfMissing("gl_journal_lines", "lineNumber", "lineNumber INT NOT NULL")
    await addColumnIfMissing("gl_journal_lines", "dimensionSetId", "dimensionSetId VARCHAR(36) NULL")
  } catch {
    // Ignore: see note above.
  }

  // Generic reporting dimensions (optional, but schema-ready).
  await ddl(
    `CREATE TABLE IF NOT EXISTS finance_dimension_definitions (
      id VARCHAR(36) PRIMARY KEY,
      dimensionKey VARCHAR(50) NOT NULL,
      name VARCHAR(100) NOT NULL,
      isActive BOOLEAN NOT NULL DEFAULT TRUE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_dimensionKey (dimensionKey)
    ) ENGINE=InnoDB`,
  )

  await ddl(
    `CREATE TABLE IF NOT EXISTS finance_dimension_values (
      id VARCHAR(36) PRIMARY KEY,
      dimensionId VARCHAR(36) NOT NULL,
      valueCode VARCHAR(50) NOT NULL,
      valueName VARCHAR(255) NOT NULL,
      isActive BOOLEAN NOT NULL DEFAULT TRUE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_dim_value (dimensionId, valueCode),
      INDEX idx_dimensionId (dimensionId),
      INDEX idx_isActive (isActive)
    ) ENGINE=InnoDB`,
  )

  await ddl(
    `CREATE TABLE IF NOT EXISTS finance_dimension_sets (
      id VARCHAR(36) PRIMARY KEY,
      signature VARCHAR(255) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_signature (signature)
    ) ENGINE=InnoDB`,
  )

  await ddl(
    `CREATE TABLE IF NOT EXISTS finance_dimension_set_items (
      id VARCHAR(36) PRIMARY KEY,
      dimensionSetId VARCHAR(36) NOT NULL,
      dimensionId VARCHAR(36) NOT NULL,
      dimensionValueId VARCHAR(36) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_set_dim (dimensionSetId, dimensionId),
      INDEX idx_set (dimensionSetId),
      INDEX idx_value (dimensionValueId)
    ) ENGINE=InnoDB`,
  )

  // Student finance subledger (minimal): charges + payments + adjustments.
  await ddl(
    `CREATE TABLE IF NOT EXISTS finance_student_transactions (
      id VARCHAR(36) PRIMARY KEY,
      studentId VARCHAR(36) NOT NULL,
      transactionType VARCHAR(20) NOT NULL,
      amount DECIMAL(18,2) NOT NULL,
      description TEXT NOT NULL,
      reference VARCHAR(100) NULL,
      paymentMethod VARCHAR(30) NULL,
      receiptNumber VARCHAR(50) NULL,
      bankReference VARCHAR(100) NULL,
      journalEntryId VARCHAR(36) NULL,
      processedBy VARCHAR(255) NOT NULL DEFAULT 'system',
      processedById VARCHAR(36) NOT NULL DEFAULT 'system',
      academicYear VARCHAR(20) NOT NULL DEFAULT '',
      semester VARCHAR(50) NOT NULL DEFAULT '',
      transactionDate DATE NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_studentId (studentId),
      INDEX idx_type (transactionType),
      INDEX idx_date (transactionDate),
      INDEX idx_year_sem (academicYear, semester)
    ) ENGINE=InnoDB`,
  )

  // Accounts payable (minimal): bills + bill payments.
  await ddl(
    `CREATE TABLE IF NOT EXISTS finance_bills (
      id VARCHAR(36) PRIMARY KEY,
      billNumber VARCHAR(50) NOT NULL,
      vendorName VARCHAR(255) NOT NULL,
      billDate DATE NOT NULL,
      dueDate DATE NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT '',
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
      taxAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
      totalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
      amountPaid DECIMAL(18,2) NOT NULL DEFAULT 0,
      amountDue DECIMAL(18,2) NOT NULL DEFAULT 0,
      reference VARCHAR(100) NULL,
      journalEntryId VARCHAR(36) NULL,
      createdBy VARCHAR(255) NOT NULL DEFAULT 'system',
      createdById VARCHAR(36) NOT NULL DEFAULT 'system',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_billNumber (billNumber),
      INDEX idx_vendorName (vendorName),
      INDEX idx_status (status),
      INDEX idx_dueDate (dueDate),
      INDEX idx_billDate (billDate)
    ) ENGINE=InnoDB`,
  )

  await ddl(
    `CREATE TABLE IF NOT EXISTS finance_bill_payments (
      id VARCHAR(36) PRIMARY KEY,
      billId VARCHAR(36) NOT NULL,
      paymentDate DATE NOT NULL,
      amount DECIMAL(18,2) NOT NULL,
      paymentMethod VARCHAR(30) NOT NULL,
      reference VARCHAR(100) NULL,
      journalEntryId VARCHAR(36) NULL,
      createdBy VARCHAR(255) NOT NULL DEFAULT 'system',
      createdById VARCHAR(36) NOT NULL DEFAULT 'system',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_billId (billId),
      INDEX idx_paymentDate (paymentDate)
    ) ENGINE=InnoDB`,
  )

  // Payroll (minimal): payroll run headers only.
  await ddl(
    `CREATE TABLE IF NOT EXISTS finance_payroll_runs (
      id VARCHAR(36) PRIMARY KEY,
      payrollNumber VARCHAR(50) NOT NULL,
      payPeriodStart DATE NOT NULL,
      payPeriodEnd DATE NOT NULL,
      payDate DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'CALCULATED',
      totalGrossPay DECIMAL(18,2) NOT NULL DEFAULT 0,
      totalDeductions DECIMAL(18,2) NOT NULL DEFAULT 0,
      totalNetPay DECIMAL(18,2) NOT NULL DEFAULT 0,
      employeeCount INT NOT NULL DEFAULT 0,
      journalEntryId VARCHAR(36) NULL,
      processedBy VARCHAR(255) NOT NULL DEFAULT 'system',
      processedById VARCHAR(36) NOT NULL DEFAULT 'system',
      approvedBy VARCHAR(255) NULL,
      approvedById VARCHAR(36) NULL,
      approvedAt DATETIME NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_payrollNumber (payrollNumber),
      INDEX idx_status (status),
      INDEX idx_payDate (payDate),
      INDEX idx_period (payPeriodStart, payPeriodEnd)
    ) ENGINE=InnoDB`,
  )
}
