import { dbQuery } from "@/lib/db"

export type ImportJobStatus =
  | "UPLOADED"
  | "VALIDATED"
  | "COMMITTED"
  | "FAILED"
  | "ROLLED_BACK"

export async function ensureExamResultsImportTables(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS exam_result_import_jobs (
      id VARCHAR(36) PRIMARY KEY,
      status VARCHAR(20) NOT NULL,
      fileName VARCHAR(255) NOT NULL,
      fileType VARCHAR(20) NOT NULL,
      headersJson LONGTEXT NOT NULL,
      mappingJson LONGTEXT NULL,
      statsJson LONGTEXT NULL,
      createdById VARCHAR(255) NOT NULL,
      createdByRole VARCHAR(50) NULL,
      createdByName VARCHAR(255) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status_createdAt (status, createdAt)
    ) ENGINE=InnoDB`,
    [],
  )

  await dbQuery(
    `CREATE TABLE IF NOT EXISTS exam_result_import_rows (
      id VARCHAR(36) PRIMARY KEY,
      jobId VARCHAR(36) NOT NULL,
      rowNumber INT NOT NULL,
      rawJson LONGTEXT NOT NULL,
      normalizedJson LONGTEXT NULL,
      rowKey VARCHAR(128) NULL,
      action VARCHAR(10) NULL,
      errorsJson LONGTEXT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_job_row (jobId, rowNumber),
      INDEX idx_job_action (jobId, action)
    ) ENGINE=InnoDB`,
    [],
  )

  await dbQuery(
    `CREATE TABLE IF NOT EXISTS exam_result_import_changes (
      id VARCHAR(36) PRIMARY KEY,
      jobId VARCHAR(36) NOT NULL,
      examResultId VARCHAR(36) NOT NULL,
      action VARCHAR(10) NOT NULL,
      oldJson LONGTEXT NULL,
      newJson LONGTEXT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_job (jobId),
      INDEX idx_examResult (examResultId)
    ) ENGINE=InnoDB`,
    [],
  )
}
