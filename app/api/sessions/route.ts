import { NextRequest, NextResponse } from "next/server"
import { dbQuery } from "@/lib/db"

type DbSession = {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: number | boolean
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
    // MySQL DATE may come back as 'YYYY-MM-DD' or as an ISO string
    return value.length >= 10 ? value.slice(0, 10) : value
  }

  return String(value ?? "")
}

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
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

async function ensureExamResultsTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_exam_results (
      id VARCHAR(36) PRIMARY KEY,
      studentId VARCHAR(36) NOT NULL,
      courseId VARCHAR(36) NOT NULL,
      examTypeId VARCHAR(36) NOT NULL,
      sessionId VARCHAR(36) NOT NULL,
      semesterId VARCHAR(36) NOT NULL,
      score DECIMAL(10,2) NOT NULL,
      maxScore DECIMAL(10,2) NOT NULL,
      percentage DECIMAL(6,2) NOT NULL,
      gradePoint DECIMAL(4,2) NOT NULL,
      letterGrade VARCHAR(3) NOT NULL,
      comments TEXT NULL,
      isPublished BOOLEAN NOT NULL DEFAULT FALSE,
      enteredBy VARCHAR(255) NOT NULL,
      enteredAt DATETIME NOT NULL,
      modifiedBy VARCHAR(255) NULL,
      modifiedAt DATETIME NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_session_semester (sessionId, semesterId),
      INDEX idx_enteredAt (enteredAt)
    ) ENGINE=InnoDB`,
    [],
  )
}

export async function GET() {
  try {
    await ensureSessionsTable()
    await ensureExamResultsTable()

    const sessions = await dbQuery<any>(
      `SELECT
        s.id, s.name, s.startDate, s.endDate, s.isActive, s.createdAt, s.updatedAt,
        COUNT(r.id) as examResultCount
      FROM sessions s
      LEFT JOIN academic_module_exam_results r ON r.sessionId = s.id
      GROUP BY s.id, s.name, s.startDate, s.endDate, s.isActive, s.createdAt, s.updatedAt
      ORDER BY s.startDate DESC`,
      [],
    )

    return NextResponse.json({
      success: true,
      data: {
        sessions: (sessions || []).map((s) => ({
          ...s,
          startDate: toYmd((s as any).startDate),
          endDate: toYmd((s as any).endDate),
          isActive: Boolean(s.isActive),
          examResultCount: Number((s as any).examResultCount || 0),
        })),
      },
    })
  } catch (error) {
    console.error("[GET /api/sessions]", error)
    const message = error instanceof Error ? error.message : "Failed to fetch sessions"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSessionsTable()

    const body = await request.json()
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const startDate = body?.startDate
    const endDate = body?.endDate

    if (!name) {
      return NextResponse.json({ success: false, message: "Session name is required" }, { status: 400 })
    }

    if (name.length > 100) {
      return NextResponse.json({ success: false, message: "Session name is too long (max 100 characters)" }, { status: 400 })
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

    // Enforce unique session name (case-insensitive)
    const existing = await dbQuery<any>(
      "SELECT id FROM sessions WHERE LOWER(name) = LOWER(?) LIMIT 1",
      [name]
    )
    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: "Session already exists" },
        { status: 409 }
      )
    }

    // Make the new session active (and deactivate others)
    await dbQuery("UPDATE sessions SET isActive = FALSE", [])
    await dbQuery(
      "INSERT INTO sessions (id, name, startDate, endDate, isActive) VALUES (UUID(), ?, ?, ?, TRUE)",
      [name, startDate, endDate]
    )

    const created = await dbQuery<any>(
      "SELECT id, name, startDate, endDate, isActive, createdAt, updatedAt FROM sessions WHERE LOWER(name) = LOWER(?) ORDER BY createdAt DESC LIMIT 1",
      [name]
    )

    return NextResponse.json(
      {
        success: true,
        message: "Session created successfully",
        data: {
          session: created[0]
            ? {
                ...created[0],
                startDate: toYmd((created[0] as any).startDate),
                endDate: toYmd((created[0] as any).endDate),
                isActive: Boolean(created[0].isActive),
              }
            : null,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/sessions]", error)
    const message = error instanceof Error ? error.message : "Failed to create session"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
