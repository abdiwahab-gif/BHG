import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import crypto from "crypto"

import { dbQuery } from "@/lib/db"
import { ensureUserPendingRegistrationsTable } from "@/app/api/auth/register/_db"

type EmailVerifyTokenPayload = {
  purpose?: string
  email?: string
}

function tokenSecret(): string {
  return process.env.JWT_SECRET || "your-secret-key-change-in-production"
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex")
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = (searchParams.get("token") || "").trim()
    if (!token) {
      return NextResponse.json({ success: false, message: "Missing token" }, { status: 400 })
    }

    let payload: EmailVerifyTokenPayload
    try {
      payload = jwt.verify(token, tokenSecret()) as EmailVerifyTokenPayload
    } catch {
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 400 })
    }

    if (payload?.purpose !== "email_verify" || !payload?.email) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 400 })
    }

    await ensureUserPendingRegistrationsTable()
    const tokenHash = sha256Hex(token)

    const pendingRows = await dbQuery<any>(
      `SELECT id, email, name, role, passwordHash, expiresAt, usedAt
       FROM user_pending_registrations
       WHERE tokenHash = ?
       LIMIT 1`,
      [tokenHash],
    )

    if (pendingRows.length === 0) {
      return NextResponse.json({ success: false, message: "Verification not found" }, { status: 404 })
    }

    const pending = pendingRows[0]
    if (pending.usedAt) {
      // Already used; treat as idempotent success if the user exists.
      const existing = await dbQuery<any>(
        "SELECT id, email, name, role FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
        [String(pending.email)],
      )
      if (existing.length > 0) {
        const user = existing[0]
        const authToken = jwt.sign(
          { userId: user.id, email: user.email, role: user.role },
          tokenSecret(),
          { expiresIn: "7d" },
        )
        return NextResponse.json({
          success: true,
          message: "Email already verified",
          token: authToken,
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
        })
      }
      return NextResponse.json({ success: false, message: "Verification link has already been used" }, { status: 400 })
    }

    const expiresAt = new Date(pending.expiresAt)
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ success: false, message: "Verification link has expired" }, { status: 400 })
    }

    if (String(pending.email || "").toLowerCase() !== String(payload.email).toLowerCase()) {
      return NextResponse.json({ success: false, message: "Token mismatch" }, { status: 400 })
    }

    const email = String(pending.email)
    const existingUser = await dbQuery<any>("SELECT id, email, name, role FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", [
      email,
    ])

    let user = existingUser[0]
    if (!user) {
      await dbQuery(
        "INSERT INTO users (email, name, password, role, isActive) VALUES (?, ?, ?, ?, ?)",
        [email, String(pending.name), String(pending.passwordHash), String(pending.role || "student"), 1],
      )

      const created = await dbQuery<any>(
        "SELECT id, email, name, role FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
        [email],
      )
      user = created[0]
    }

    await dbQuery("UPDATE user_pending_registrations SET usedAt = NOW() WHERE id = ?", [String(pending.id)])

    const authToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      tokenSecret(),
      { expiresIn: "7d" },
    )

    return NextResponse.json({
      success: true,
      message: "Email verified",
      token: authToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
  } catch (error) {
    console.error("[GET /api/auth/verify-email]", error)
    const message = error instanceof Error ? error.message : "Failed to verify email"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
