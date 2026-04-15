import { NextRequest, NextResponse } from "next/server"
import type { Notice, NoticeAttachment, NoticeTarget } from "@/types/notice"
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
    return raw.map((v) => String(v)).filter(Boolean) as NoticeTarget[]
  }
  if (typeof raw === "string" && raw.trim()) {
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

  if (Array.isArray(raw)) return raw.map(normalize).filter(Boolean) as NoticeAttachment[]
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.map(normalize).filter(Boolean) as NoticeAttachment[]
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

    await ensureNoticesTable()

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Missing notice id" }, { status: 400 })
    }
    const whereSql = auth.isAdmin ? "id = ?" : "id = ? AND createdById = ?"
    const whereParams = auth.isAdmin ? [id] : [id, auth.userId]

    const rows = await dbQuery<DbNoticeRow>(
      `SELECT id, title, content, type, priority, status, target, publishDate, expiryDate, createdById, createdByName, createdByRole, createdAt, updatedAt, attachments, views, pinned FROM academic_module_notices WHERE ${whereSql} LIMIT 1`,
      whereParams
    )

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 })
    }

    await dbQuery(`UPDATE academic_module_notices SET views = views + 1 WHERE ${whereSql}`, whereParams)

    const updatedRows = await dbQuery<DbNoticeRow>(
      `SELECT id, title, content, type, priority, status, target, publishDate, expiryDate, createdById, createdByName, createdByRole, createdAt, updatedAt, attachments, views, pinned FROM academic_module_notices WHERE ${whereSql} LIMIT 1`,
      whereParams
    )

    return NextResponse.json(rowToNotice(updatedRows[0]))
  } catch (error) {
    console.error('Error fetching notice:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notice' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

    await ensureNoticesTable()

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Missing notice id" }, { status: 400 })
    }
    const body = await request.json().catch(() => null)

    const set: string[] = []
    const values: any[] = []

    if (typeof body?.title === "string") {
      set.push("title = ?")
      values.push(body.title.trim())
    }
    if (typeof body?.content === "string") {
      set.push("content = ?")
      values.push(body.content.trim())
    }
    if (typeof body?.type === "string") {
      set.push("type = ?")
      values.push(body.type.trim())
    }
    if (typeof body?.priority === "string") {
      set.push("priority = ?")
      values.push(body.priority.trim())
    }
    if (typeof body?.status === "string") {
      set.push("status = ?")
      values.push(body.status.trim())
    }
    if (typeof body?.pinned === "boolean") {
      set.push("pinned = ?")
      values.push(body.pinned ? 1 : 0)
    }
    if (body?.target !== undefined) {
      const targets = parseTargets(body.target)
      set.push("target = ?")
      values.push(JSON.stringify(targets))
    }
    if (typeof body?.publishDate === "string") {
      const publishDate = new Date(body.publishDate)
      if (Number.isNaN(publishDate.getTime())) {
        return NextResponse.json({ error: "Invalid publishDate" }, { status: 400 })
      }
      set.push("publishDate = ?")
      values.push(publishDate)
    }
    if (body?.expiryDate !== undefined) {
      if (body.expiryDate === null || body.expiryDate === "") {
        set.push("expiryDate = NULL")
      } else if (typeof body.expiryDate === "string") {
        const expiryDate = new Date(body.expiryDate)
        if (Number.isNaN(expiryDate.getTime())) {
          return NextResponse.json({ error: "Invalid expiryDate" }, { status: 400 })
        }
        set.push("expiryDate = ?")
        values.push(expiryDate)
      }
    }
    if (body?.attachments !== undefined) {
      const attachments = parseAttachments(body.attachments)
      set.push("attachments = ?")
      values.push(attachments.length ? JSON.stringify(attachments) : null)
    }

    if (set.length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }

    const whereSql = auth.isAdmin ? "id = ?" : "id = ? AND createdById = ?"
    const whereParams = auth.isAdmin ? [id] : [id, auth.userId]

    const existing = await dbQuery<any>(`SELECT id FROM academic_module_notices WHERE ${whereSql} LIMIT 1`, whereParams)
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 })
    }

    await dbQuery(`UPDATE academic_module_notices SET ${set.join(", ")} WHERE ${whereSql}`, [...values, ...whereParams])

    const rows = await dbQuery<DbNoticeRow>(
      `SELECT id, title, content, type, priority, status, target, publishDate, expiryDate, createdById, createdByName, createdByRole, createdAt, updatedAt, attachments, views, pinned FROM academic_module_notices WHERE ${whereSql} LIMIT 1`,
      whereParams
    )

    return NextResponse.json(rowToNotice(rows[0]))
  } catch (error) {
    console.error('Error updating notice:', error)
    return NextResponse.json(
      { error: 'Failed to update notice' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

    await ensureNoticesTable()

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Missing notice id" }, { status: 400 })
    }
    const whereSql = auth.isAdmin ? "id = ?" : "id = ? AND createdById = ?"
    const whereParams = auth.isAdmin ? [id] : [id, auth.userId]

    const existing = await dbQuery<any>(`SELECT id FROM academic_module_notices WHERE ${whereSql} LIMIT 1`, whereParams)
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 })
    }

    await dbQuery(`DELETE FROM academic_module_notices WHERE ${whereSql}`, whereParams)

    return NextResponse.json({ message: "Notice deleted successfully" })
  } catch (error) {
    console.error('Error deleting notice:', error)
    return NextResponse.json(
      { error: 'Failed to delete notice' },
      { status: 500 }
    )
  }
}