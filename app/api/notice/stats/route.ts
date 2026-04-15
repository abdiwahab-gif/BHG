import { NextResponse } from "next/server"
import type { NoticeStats } from "@/types/notice"
import { dbQuery } from "@/lib/db"

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

export async function GET() {
  try {
    await ensureNoticesTable()

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const rows = await dbQuery<any>(
      `SELECT
        COUNT(*) as total,
        SUM(status = 'published') as published,
        SUM(status = 'draft') as draft,
        SUM(status = 'archived') as archived,
        SUM(priority = 'urgent') as urgent,
        SUM(publishDate >= ? AND publishDate < ?) as thisMonth
      FROM academic_module_notices`,
      [monthStart, nextMonthStart]
    )

    const row = rows?.[0] || {}
    const stats: NoticeStats = {
      total: Number(row.total || 0),
      published: Number(row.published || 0),
      draft: Number(row.draft || 0),
      archived: Number(row.archived || 0),
      urgent: Number(row.urgent || 0),
      thisMonth: Number(row.thisMonth || 0),
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching notice stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notice stats' },
      { status: 500 }
    )
  }
}