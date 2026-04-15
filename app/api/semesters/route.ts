import { NextRequest, NextResponse } from "next/server"
import { dbQuery } from "@/lib/db"

type DbSemester = {
  id: string
  sessionId: string
  name: string
  startDate: any
  endDate: any
  createdAt?: string
  updatedAt?: string
}

function toYmd(value: any): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, "0")
    const day = String(value.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  if (typeof value === "string") {
    return value.length >= 10 ? value.slice(0, 10) : value
  }

  return String(value ?? "")
}

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

async function ensureSemestersTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_semesters (
      id VARCHAR(36) PRIMARY KEY,
      sessionId VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_sessionId (sessionId),
      INDEX idx_name (name)
    ) ENGINE=InnoDB`,
    []
  )
}

async function ensureSessionsTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      isActive BOOLEAN DEFAULT FALSE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_isActive (isActive)
    ) ENGINE=InnoDB`,
    []
  )
}

async function getActiveSessionId(): Promise<string | null> {
  await ensureSessionsTable()
  const rows = await dbQuery<any>("SELECT id FROM sessions WHERE isActive = TRUE LIMIT 1", [])
  return rows[0]?.id ? String(rows[0].id) : null
}

export async function GET(request: NextRequest) {
  try {
    await ensureSemestersTable()

    const { searchParams } = new URL(request.url)
    const sessionIdParam = searchParams.get("sessionId")?.trim()
    const sessionId = sessionIdParam || (await getActiveSessionId())

    if (!sessionId) {
      return NextResponse.json({ success: true, data: [] })
    }

    const rows = await dbQuery<any>(
      "SELECT id, sessionId, name, startDate, endDate, createdAt, updatedAt FROM academic_module_semesters WHERE sessionId = ? ORDER BY startDate DESC",
      [sessionId]
    )

    return NextResponse.json({
      success: true,
      data: (rows || []).map((s) => ({
        ...s,
        startDate: toYmd((s as any).startDate),
        endDate: toYmd((s as any).endDate),
      })),
    })
  } catch (error) {
    console.error("[GET /api/semesters]", error)
    const message = error instanceof Error ? error.message : "Failed to fetch semesters"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSemestersTable()

    const sessionId = await getActiveSessionId()
    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: "No active session found. Create/select a session first." },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => null)
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const startDate = body?.startDate
    const endDate = body?.endDate

    if (!name) {
      return NextResponse.json({ success: false, message: "Semester name is required" }, { status: 400 })
    }

    if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
      return NextResponse.json(
        { success: false, message: "Start date and end date are required" },
        { status: 400 }
      )
    }

    if (new Date(endDate).getTime() <= new Date(startDate).getTime()) {
      return NextResponse.json(
        { success: false, message: "End date must be after start date" },
        { status: 400 }
      )
    }

    const existing = await dbQuery<any>(
      "SELECT id FROM academic_module_semesters WHERE sessionId = ? AND LOWER(name) = LOWER(?) LIMIT 1",
      [sessionId, name]
    )
    if (existing.length > 0) {
      return NextResponse.json({ success: false, message: "Semester already exists" }, { status: 409 })
    }

    await dbQuery(
      "INSERT INTO academic_module_semesters (id, sessionId, name, startDate, endDate) VALUES (UUID(), ?, ?, ?, ?)",
      [sessionId, name, startDate, endDate]
    )

    const created = await dbQuery<any>(
      "SELECT id, sessionId, name, startDate, endDate, createdAt, updatedAt FROM academic_module_semesters WHERE sessionId = ? AND LOWER(name) = LOWER(?) ORDER BY createdAt DESC LIMIT 1",
      [sessionId, name]
    )

    return NextResponse.json(
      {
        success: true,
        message: "Semester created successfully",
        data: created[0]
          ? {
              ...created[0],
              startDate: toYmd((created[0] as any).startDate),
              endDate: toYmd((created[0] as any).endDate),
            }
          : null,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/semesters]", error)
    const message = error instanceof Error ? error.message : "Failed to create semester"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
