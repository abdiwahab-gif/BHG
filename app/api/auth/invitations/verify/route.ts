import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import crypto from "crypto"

import { dbQuery } from "@/lib/db"
import { ensureUserInvitationsTable } from "../_db"

function tokenSecret(): string {
  return process.env.JWT_SECRET || "your-secret-key-change-in-production"
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex")
}

type InviteTokenPayload = {
  purpose?: string
  email?: string
  name?: string
  role?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = (searchParams.get("token") || "").trim()
    if (!token) {
      return NextResponse.json({ success: false, message: "Missing token" }, { status: 400 })
    }

    let payload: InviteTokenPayload
    try {
      payload = jwt.verify(token, tokenSecret()) as InviteTokenPayload
    } catch {
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 400 })
    }

    if (payload?.purpose !== "user_invite" || !payload?.email) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 400 })
    }

    await ensureUserInvitationsTable()
    const tokenHash = sha256Hex(token)

    const rows = await dbQuery<any>(
      `SELECT email, name, role, expiresAt, usedAt
       FROM user_invitations
       WHERE tokenHash = ?
       LIMIT 1`,
      [tokenHash],
    )

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: "Invitation not found" }, { status: 404 })
    }

    const invite = rows[0]
    if (invite.usedAt) {
      return NextResponse.json({ success: false, message: "Invitation link has already been used" }, { status: 400 })
    }

    const expiresAt = new Date(invite.expiresAt)
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ success: false, message: "Invitation link has expired" }, { status: 400 })
    }

    // Ensure payload email matches stored invite email (case-insensitive)
    if (String(invite.email || "").toLowerCase() !== String(payload.email).toLowerCase()) {
      return NextResponse.json({ success: false, message: "Invitation token mismatch" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        email: String(invite.email),
        name: invite.name ? String(invite.name) : payload.name ? String(payload.name) : "",
        role: String(invite.role || payload.role || "student"),
        expiresAt: expiresAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("[GET /api/auth/invitations/verify]", error)
    const message = error instanceof Error ? error.message : "Failed to verify invitation"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
