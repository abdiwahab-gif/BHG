import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { AuditLogger } from "@/lib/audit-logger"
import { AuthService } from "@/lib/auth"

const auditLogFilterSchema = z.object({
  userId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  action: z.string().optional(),
  dateFrom: z
    .string()
    .transform((val) => (val ? new Date(val) : undefined))
    .optional(),
  dateTo: z
    .string()
    .transform((val) => (val ? new Date(val) : undefined))
    .optional(),
  page: z
    .string()
    .transform((val) => Number.parseInt(val) || 1)
    .optional(),
  limit: z
    .string()
    .transform((val) => Number.parseInt(val) || 50)
    .optional(),
})

const auditLogCreateSchema = z.object({
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().optional().default(""),
  oldValues: z.record(z.any()).optional(),
  newValues: z.record(z.any()).optional(),
  reason: z.string().optional(),
  sessionId: z.string().optional(),
  additionalData: z.record(z.any()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    // Get user from headers (set by middleware)
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")
    const userName = request.headers.get("x-user-name")

    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const user = {
      id: userId,
      role: userRole as any,
      name: userName,
      isActive: true,
    }

    // Check permissions
    if (!AuthService.hasPermission(user, "audit_logs", "read")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filters = auditLogFilterSchema.parse(Object.fromEntries(searchParams))

    // Teachers can only see their own audit logs
    if (userRole === "teacher") {
      filters.userId = userId
    }

    const result = await AuditLogger.getAuditLogs(filters)

    return NextResponse.json({
      success: true,
      data: result.logs,
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 50,
        total: result.total,
        totalPages: Math.ceil(result.total / (filters.limit || 50)),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid filters", details: error.errors }, { status: 400 })
    }

    console.error("Error fetching audit logs:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch audit logs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")
    const userName = request.headers.get("x-user-name")

    if (!userId) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const user = {
      id: userId,
      role: (userRole as any) || "student",
      name: userName || "",
      isActive: true,
    }

    // Any authenticated actor can write their own audit trail.
    if (!AuthService.hasPermission(user, "audit_logs", "read_own") && !AuthService.hasPermission(user, "audit_logs", "read")) {
      // If the role doesn't even have audit log visibility, we still allow log writes
      // so the system can keep an immutable record.
    }

    const body = await request.json().catch(() => null)
    const parsed = auditLogCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid audit log entry", details: parsed.error.errors },
        { status: 400 },
      )
    }

    const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    await AuditLogger.log({
      userId,
      userRole: String(userRole || ""),
      userName: String(userName || ""),
      action: parsed.data.action as any,
      entityType: parsed.data.entityType as any,
      entityId: parsed.data.entityId || "",
      oldValues: parsed.data.oldValues,
      newValues: parsed.data.newValues,
      reason: parsed.data.reason,
      sessionId: parsed.data.sessionId,
      additionalData: parsed.data.additionalData,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("Error creating audit log:", error)
    return NextResponse.json({ success: false, error: "Failed to create audit log" }, { status: 500 })
  }
}
