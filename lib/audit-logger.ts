export interface AuditLogEntry {
  id: string
  userId: string
  userRole: string
  userName: string
  action: AuditAction
  entityType: EntityType
  entityId: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: Date
  reason?: string
  sessionId?: string
  additionalData?: Record<string, any>
}

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "PUBLISH"
  | "UNPUBLISH"
  | "LOGIN"
  | "LOGOUT"
  | "ACCESS"
  | "EXPORT"
  | "CALCULATE_GPA"
  | "GENERATE_TRANSCRIPT"

export type EntityType =
  | "EXAM_RESULT"
  | "EXAM_TYPE"
  | "GRADING_SYSTEM"
  | "GRADE_MAPPING"
  | "USER"
  | "STUDENT"
  | "MEMBER"
  | "INCOME"
  | "EXPENSE"
  | "COURSE"
  | "SESSION"
  | "TRANSCRIPT"
  | "CLASS"
  | "TEACHER"
  | "FINANCE_PAYMENT"
  | "EXAM_RESULTS_IMPORT"

import { randomUUID } from "crypto"
import { dbQuery } from "@/lib/db"

async function ensureAuditLogsTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(36) PRIMARY KEY,
      userId VARCHAR(255) NOT NULL,
      userRole VARCHAR(50) NULL,
      userName VARCHAR(255) NULL,
      action VARCHAR(30) NOT NULL,
      entityType VARCHAR(100) NOT NULL,
      entityId VARCHAR(255) NULL,
      oldValues LONGTEXT NULL,
      newValues LONGTEXT NULL,
      ipAddress VARCHAR(45) NULL,
      userAgent LONGTEXT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reason LONGTEXT NULL,
      sessionId VARCHAR(36) NULL,
      additionalData LONGTEXT NULL,
      INDEX idx_user_action (userId, action),
      INDEX idx_entity (entityType, entityId),
      INDEX idx_timestamp (timestamp)
    ) ENGINE=InnoDB`,
    [],
  )
}

function toDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  const d = new Date(String(value || ""))
  if (Number.isNaN(d.getTime())) return new Date(0)
  return d
}

function safeJsonStringify(value: unknown): string | null {
  if (value === undefined) return null
  if (value === null) return null
  try {
    return JSON.stringify(value)
  } catch {
    return JSON.stringify({ error: "unserializable" })
  }
}

function safeJsonParse<T>(value: unknown): T | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  try {
    return JSON.parse(trimmed) as T
  } catch {
    return undefined
  }
}

export class AuditLogger {
  static async log(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<void> {
    await ensureAuditLogsTable()

    const auditEntry: AuditLogEntry = {
      id: randomUUID(),
      timestamp: new Date(),
      ...entry,
    }

    await dbQuery(
      `INSERT INTO audit_logs (
        id, userId, userRole, userName, action, entityType, entityId,
        oldValues, newValues, ipAddress, userAgent, timestamp, reason, sessionId, additionalData
      ) VALUES (
        ?, ?, NULLIF(?, ''), NULLIF(?, ''), ?, ?, NULLIF(?, ''),
        ?, ?, NULLIF(?, ''), NULLIF(?, ''), ?, NULLIF(?, ''), NULLIF(?, ''), ?
      )`,
      [
        auditEntry.id,
        auditEntry.userId,
        auditEntry.userRole,
        auditEntry.userName,
        auditEntry.action,
        auditEntry.entityType,
        auditEntry.entityId,
        safeJsonStringify(auditEntry.oldValues),
        safeJsonStringify(auditEntry.newValues),
        auditEntry.ipAddress,
        auditEntry.userAgent,
        auditEntry.timestamp,
        auditEntry.reason,
        auditEntry.sessionId,
        safeJsonStringify(auditEntry.additionalData),
      ],
    )
  }

  static async logExamResultChange(
    user: any,
    action: AuditAction,
    examResultId: string,
    oldValues?: any,
    newValues?: any,
    reason?: string,
    request?: any,
  ): Promise<void> {
    await this.log({
      userId: user.id,
      userRole: user.role,
      userName: user.name,
      action,
      entityType: "EXAM_RESULT",
      entityId: examResultId,
      oldValues,
      newValues,
      ipAddress: request?.headers?.get("x-forwarded-for") || request?.ip || "unknown",
      userAgent: request?.headers?.get("user-agent") || "unknown",
      reason,
      sessionId: request?.sessionId,
    })
  }

  static async logUserAccess(
    user: any,
    action: AuditAction,
    entityType: EntityType,
    entityId: string,
    request?: any,
  ): Promise<void> {
    await this.log({
      userId: user.id,
      userRole: user.role,
      userName: user.name,
      action,
      entityType,
      entityId,
      ipAddress: request?.headers?.get("x-forwarded-for") || request?.ip || "unknown",
      userAgent: request?.headers?.get("user-agent") || "unknown",
      sessionId: request?.sessionId,
    })
  }

  static async logGPACalculation(user: any, studentId: string, calculationData: any, request?: any): Promise<void> {
    await this.log({
      userId: user.id,
      userRole: user.role,
      userName: user.name,
      action: "CALCULATE_GPA",
      entityType: "STUDENT",
      entityId: studentId,
      additionalData: calculationData,
      ipAddress: request?.headers?.get("x-forwarded-for") || request?.ip || "unknown",
      userAgent: request?.headers?.get("user-agent") || "unknown",
      sessionId: request?.sessionId,
    })
  }

  static async logTranscriptGeneration(
    user: any,
    studentId: string,
    transcriptData: any,
    request?: any,
  ): Promise<void> {
    await this.log({
      userId: user.id,
      userRole: user.role,
      userName: user.name,
      action: "GENERATE_TRANSCRIPT",
      entityType: "TRANSCRIPT",
      entityId: `${studentId}-${Date.now()}`,
      additionalData: {
        studentId,
        sessionId: transcriptData.sessionId,
        semesterId: transcriptData.semesterId,
      },
      ipAddress: request?.headers?.get("x-forwarded-for") || request?.ip || "unknown",
      userAgent: request?.headers?.get("user-agent") || "unknown",
      sessionId: request?.sessionId,
    })
  }

  static async getAuditLogs(filters: {
    userId?: string
    entityType?: EntityType
    entityId?: string
    action?: AuditAction
    dateFrom?: Date
    dateTo?: Date
    page?: number
    limit?: number
  }): Promise<{ logs: AuditLogEntry[]; total: number }> {
    await ensureAuditLogsTable()

    const where: string[] = []
    const params: unknown[] = []

    if (filters.userId) {
      where.push("userId = ?")
      params.push(filters.userId)
    }
    if (filters.entityType) {
      where.push("entityType = ?")
      params.push(filters.entityType)
    }
    if (filters.entityId) {
      where.push("entityId = ?")
      params.push(filters.entityId)
    }
    if (filters.action) {
      where.push("action = ?")
      params.push(filters.action)
    }
    if (filters.dateFrom) {
      where.push("timestamp >= ?")
      params.push(filters.dateFrom)
    }
    if (filters.dateTo) {
      where.push("timestamp <= ?")
      params.push(filters.dateTo)
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""
    const page = Number(filters.page || 1)
    const limit = Math.min(Math.max(Number(filters.limit || 50), 1), 200)
    const offset = Math.max(0, (page - 1) * limit)

    const totalRows = await dbQuery<any>(`SELECT COUNT(*) as total FROM audit_logs ${whereSql}`, params)
    const total = Number(totalRows?.[0]?.total || 0)

    const rows = await dbQuery<any>(
      `SELECT
        id, userId, userRole, userName, action, entityType, entityId,
        oldValues, newValues, ipAddress, userAgent, timestamp, reason, sessionId, additionalData
      FROM audit_logs
      ${whereSql}
      ORDER BY timestamp DESC
      LIMIT ${offset}, ${limit}`,
      params,
    )

    const logs: AuditLogEntry[] = (rows || []).map((r: any) => ({
      id: String(r.id),
      userId: String(r.userId),
      userRole: String(r.userRole || ""),
      userName: String(r.userName || ""),
      action: String(r.action) as AuditAction,
      entityType: String(r.entityType) as EntityType,
      entityId: String(r.entityId || ""),
      oldValues: safeJsonParse<Record<string, any>>(r.oldValues),
      newValues: safeJsonParse<Record<string, any>>(r.newValues),
      ipAddress: String(r.ipAddress || ""),
      userAgent: String(r.userAgent || ""),
      timestamp: toDate(r.timestamp),
      reason: typeof r.reason === "string" ? r.reason : undefined,
      sessionId: typeof r.sessionId === "string" ? r.sessionId : undefined,
      additionalData: safeJsonParse<Record<string, any>>(r.additionalData),
    }))

    return { logs, total }
  }

  private static async sendToExternalAuditService(entry: AuditLogEntry): Promise<void> {
    // Implementation for external audit service
    // This could be a webhook, message queue, or external API call
    try {
      // Example: Send to external audit service
      // await fetch('https://audit-service.example.com/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry)
      // })
    } catch (error) {
      console.error("Failed to send audit log to external service:", error)
    }
  }
}

// Middleware for automatic audit logging
export function withAuditLogging<T extends (...args: any[]) => any>(
  fn: T,
  entityType: EntityType,
  action: AuditAction,
): T {
  return (async (...args: any[]) => {
    const [request, user, ...otherArgs] = args
    const startTime = Date.now()

    try {
      const result = await fn(...args)

      // Log successful operation
      await AuditLogger.log({
        userId: user?.id || "system",
        userRole: user?.role || "system",
        userName: user?.name || "System",
        action,
        entityType,
        entityId: result?.id || "unknown",
        ipAddress: request?.headers?.get("x-forwarded-for") || "unknown",
        userAgent: request?.headers?.get("user-agent") || "unknown",
        additionalData: {
          executionTime: Date.now() - startTime,
          success: true,
        },
      })

      return result
    } catch (error) {
      // Log failed operation
      await AuditLogger.log({
        userId: user?.id || "system",
        userRole: user?.role || "system",
        userName: user?.name || "System",
        action,
        entityType,
        entityId: "unknown",
        ipAddress: request?.headers?.get("x-forwarded-for") || "unknown",
        userAgent: request?.headers?.get("user-agent") || "unknown",
        additionalData: {
          executionTime: Date.now() - startTime,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      })

      throw error
    }
  }) as T
}
