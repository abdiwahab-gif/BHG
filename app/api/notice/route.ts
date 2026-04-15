import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import type { Notice, NoticeAttachment, NoticeFilters, NoticeResponse, NoticeTarget } from "@/types/notice"
import { dbQuery } from "@/lib/db"
import { requireAuth } from "@/lib/server-auth"

type DbNoticeRow = {
  id: string
  title: string
  content: string
  type: string
  priority: string
  status: string
  target: string
  publishDate: Date | string
  expiryDate: Date | string | null
  createdById: string
  createdByName: string
  createdByRole: string
  createdAt: Date | string
  updatedAt: Date | string
  attachments: string | null
  views: number
  pinned: number
}

async function ensureNoticesTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_notices (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      type VARCHAR(20) NOT NULL,
      priority VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'published',
      target TEXT NOT NULL,
      publishDate DATETIME NOT NULL,
      expiryDate DATETIME NULL,
      createdById VARCHAR(36) NOT NULL,
      createdByName VARCHAR(255) NOT NULL,
      createdByRole VARCHAR(255) NOT NULL,
      attachments LONGTEXT NULL,
      views INT NOT NULL DEFAULT 0,
      pinned TINYINT(1) NOT NULL DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_priority (priority),
      INDEX idx_type (type),
      INDEX idx_publishDate (publishDate),
      INDEX idx_pinned (pinned),
      INDEX idx_createdById (createdById)
    ) ENGINE=InnoDB`,
    []
  )
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function parseTargets(raw: unknown): NoticeTarget[] {
  if (Array.isArray(raw)) {
    return raw
      .map((v) => String(v))
      .filter(Boolean) as NoticeTarget[]
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v)).filter(Boolean) as NoticeTarget[]
      }
    } catch {
      return []
    }
  }
  return []
}

function parseAttachments(raw: unknown): NoticeAttachment[] {
  const normalize = (value: any): NoticeAttachment | null => {
    const id = typeof value?.id === "string" && value.id ? value.id : `att_${Date.now()}_${Math.random().toString(16).slice(2)}`
    const name = typeof value?.name === "string" ? value.name : ""
    const url = typeof value?.url === "string" ? value.url : ""
    const size = typeof value?.size === "number" ? value.size : 0
    const type = typeof value?.type === "string" ? value.type : ""

    if (!name) return null
    return { id, name, url, size, type }
  }

  if (Array.isArray(raw)) {
    return raw.map(normalize).filter(Boolean) as NoticeAttachment[]
  }

  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map(normalize).filter(Boolean) as NoticeAttachment[]
      }
    } catch {
      return []
    }
  }

  return []
}

function rowToNotice(row: DbNoticeRow): Notice {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type as any,
    priority: row.priority as any,
    status: row.status as any,
    target: parseTargets(row.target),
    publishDate: toIso(row.publishDate) || new Date().toISOString(),
    expiryDate: toIso(row.expiryDate),
    createdBy: {
      id: row.createdById,
      name: row.createdByName,
      role: row.createdByRole,
    },
    createdAt: toIso(row.createdAt) || new Date().toISOString(),
    updatedAt: toIso(row.updatedAt) || new Date().toISOString(),
    attachments: row.attachments ? parseAttachments(row.attachments) : undefined,
    views: Number(row.views || 0),
    pinned: Boolean(row.pinned),
  }
}

function normalizeFilterValue(value: string | null): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.toLowerCase() === "all") return undefined
  return trimmed
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

    await ensureNoticesTable()

    const { searchParams } = new URL(request.url)
    const rawPage = Number.parseInt(searchParams.get("page") || "1", 10)
    const rawLimit = Number.parseInt(searchParams.get("limit") || "10", 10)
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 10
    const skip = (page - 1) * limit

    const filters: NoticeFilters = {
      type: normalizeFilterValue(searchParams.get("type")) as any,
      priority: normalizeFilterValue(searchParams.get("priority")) as any,
      status: (normalizeFilterValue(searchParams.get("status")) as any) || "published",
      target: normalizeFilterValue(searchParams.get("target")) as any,
      dateFrom: normalizeFilterValue(searchParams.get("dateFrom")),
      dateTo: normalizeFilterValue(searchParams.get("dateTo")),
      search: normalizeFilterValue(searchParams.get("search")),
      createdBy: normalizeFilterValue(searchParams.get("createdBy")),
    }

    const where: string[] = []
    const params: any[] = []

    if (!auth.isAdmin) {
      where.push("createdById = ?")
      params.push(auth.userId)
    }

    if (filters.type) {
      where.push("type = ?")
      params.push(filters.type)
    }
    if (filters.priority) {
      where.push("priority = ?")
      params.push(filters.priority)
    }
    if (filters.status) {
      where.push("status = ?")
      params.push(filters.status)
    }
    if (auth.isAdmin && filters.createdBy) {
      where.push("createdById = ?")
      params.push(filters.createdBy)
    }
    if (filters.target) {
      where.push("target LIKE ?")
      params.push(`%"${filters.target}"%`)
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom)
      from.setHours(0, 0, 0, 0)
      where.push("publishDate >= ?")
      params.push(from)
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo)
      to.setHours(23, 59, 59, 999)
      where.push("publishDate <= ?")
      params.push(to)
    }
    if (filters.search) {
      where.push("(title LIKE ? OR content LIKE ? OR createdByName LIKE ?)")
      const needle = `%${filters.search}%`
      params.push(needle, needle, needle)
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const totalRows = await dbQuery<any>(
      `SELECT COUNT(*) as total FROM academic_module_notices ${whereSql}`,
      params
    )
    const total = Number(totalRows?.[0]?.total || 0)

    const rows = await dbQuery<DbNoticeRow>(
      `SELECT id, title, content, type, priority, status, target, publishDate, expiryDate, createdById, createdByName, createdByRole, createdAt, updatedAt, attachments, views, pinned
       FROM academic_module_notices
       ${whereSql}
       ORDER BY pinned DESC, publishDate DESC
       LIMIT ${limit} OFFSET ${skip}`,
      params
    )

    const response: NoticeResponse = {
      notices: (rows || []).map(rowToNotice),
      total,
      page,
      limit,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching notices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notices' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

    await ensureNoticesTable()

    const body = await request.json().catch(() => null)
    const title = typeof body?.title === "string" ? body.title.trim() : ""
    const content = typeof body?.content === "string" ? body.content.trim() : ""
    const type = typeof body?.type === "string" ? body.type.trim() : "general"
    const priority = typeof body?.priority === "string" ? body.priority.trim() : "medium"
    const status = typeof body?.status === "string" ? body.status.trim() : "published"
    const publishDateRaw = typeof body?.publishDate === "string" ? body.publishDate : new Date().toISOString()
    const expiryDateRaw = typeof body?.expiryDate === "string" ? body.expiryDate : undefined
    const pinned = Boolean(body?.pinned)
    const targets = parseTargets(body?.target)

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }
    if (!Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json({ error: "Target audience is required" }, { status: 400 })
    }

    const id = crypto.randomUUID()
    const userRows = await dbQuery<any>("SELECT id, name, role FROM users WHERE id = ? LIMIT 1", [auth.userId])
    const user = userRows?.[0]
    if (!user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    const createdBy = {
      id: String(user.id),
      name: String(user.name || auth.email || ""),
      role: String(user.role || auth.role),
    }

    const publishDate = new Date(publishDateRaw)
    if (Number.isNaN(publishDate.getTime())) {
      return NextResponse.json({ error: "Invalid publishDate" }, { status: 400 })
    }

    const expiryDate = expiryDateRaw ? new Date(expiryDateRaw) : null
    if (expiryDateRaw && (!expiryDate || Number.isNaN(expiryDate.getTime()))) {
      return NextResponse.json({ error: "Invalid expiryDate" }, { status: 400 })
    }

    const attachments = parseAttachments(body?.attachments)
    const attachmentsJson = attachments.length ? JSON.stringify(attachments) : null

    await dbQuery(
      `INSERT INTO academic_module_notices (
        id, title, content, type, priority, status, target, publishDate, expiryDate,
        createdById, createdByName, createdByRole, attachments, views, pinned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        id,
        title,
        content,
        type,
        priority,
        status,
        JSON.stringify(targets),
        publishDate,
        expiryDate,
        createdBy.id,
        createdBy.name,
        createdBy.role,
        attachmentsJson,
        pinned ? 1 : 0,
      ]
    )

    const rows = await dbQuery<DbNoticeRow>(
      "SELECT id, title, content, type, priority, status, target, publishDate, expiryDate, createdById, createdByName, createdByRole, createdAt, updatedAt, attachments, views, pinned FROM academic_module_notices WHERE id = ? LIMIT 1",
      [id]
    )

    return NextResponse.json(rowToNotice(rows[0]), { status: 201 })
  } catch (error) {
    console.error('Error creating notice:', error)
    return NextResponse.json(
      { error: 'Failed to create notice' },
      { status: 500 }
    )
  }
}