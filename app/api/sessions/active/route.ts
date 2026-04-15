import { NextRequest, NextResponse } from "next/server"
import { dbQuery } from "@/lib/db"

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

export async function POST(request: NextRequest) {
  try {
    await ensureSessionsTable()

    const body = await request.json()
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : ""

    if (!sessionId) {
      return NextResponse.json({ success: false, message: "sessionId is required" }, { status: 400 })
    }

    const existing = await dbQuery<{ id: string }>("SELECT id FROM sessions WHERE id = ? LIMIT 1", [sessionId])
    if (existing.length === 0) {
      return NextResponse.json({ success: false, message: "Session not found" }, { status: 404 })
    }

    await dbQuery("UPDATE sessions SET isActive = FALSE", [])
    await dbQuery("UPDATE sessions SET isActive = TRUE WHERE id = ?", [sessionId])

    return NextResponse.json({ success: true, message: "Active session updated" })
  } catch (error) {
    console.error("[POST /api/sessions/active]", error)
    const message = error instanceof Error ? error.message : "Failed to update active session"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
