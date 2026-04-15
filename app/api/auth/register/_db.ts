import { dbQuery } from "@/lib/db"

export async function ensureUserPendingRegistrationsTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS user_pending_registrations (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'student',
      passwordHash VARCHAR(255) NOT NULL,

      tokenHash CHAR(64) NOT NULL,
      expiresAt DATETIME NOT NULL,
      usedAt DATETIME NULL,

      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      UNIQUE KEY uniq_tokenHash (tokenHash),
      INDEX idx_email (email),
      INDEX idx_expiresAt (expiresAt),
      INDEX idx_usedAt (usedAt)
    ) ENGINE=InnoDB`,
    [],
  )
}
