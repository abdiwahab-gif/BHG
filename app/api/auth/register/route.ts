import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"

import { dbQuery } from "@/lib/db"
import { validatePasswordPolicy } from "@/lib/password-policy"
import { ensureUserInvitationsTable } from "../invitations/_db"
import { ensureUserPendingRegistrationsTable } from "./_db"
import { sendEmail } from "@/lib/email"

const inviteBodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
  name: z.string().trim().min(2).max(255).optional(),
})

const selfBodySchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(255),
  password: z.string().min(1),
})

type InviteTokenPayload = {
  purpose?: string
  email?: string
  name?: string
  role?: string
}

type EmailVerifyTokenPayload = {
  purpose?: string
  email?: string
}

function getBaseUrl(request: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL
  if (explicit && /^https?:\/\//i.test(explicit)) return explicit.replace(/\/$/, "")

  const proto = request.headers.get("x-forwarded-proto") || "http"
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  if (host) return `${proto}://${host}`
  return "http://localhost:3000"
}

function tokenSecret(): string {
  return process.env.JWT_SECRET || "your-secret-key-change-in-production"
}

function requireEmailVerification(): boolean {
  return String(process.env.REQUIRE_EMAIL_VERIFICATION || "").toLowerCase() === "true"
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex")
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    // Mode 1: invite-token based registration (admin invite)
    if (body && typeof body === "object" && "token" in body) {
      const parsed = inviteBodySchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, message: parsed.error.issues[0]?.message || "Invalid request" },
          { status: 400 },
        )
      }

      const { token, password, name } = parsed.data

      const policy = validatePasswordPolicy(password)
      if (!policy.isValid) {
        return NextResponse.json(
          { success: false, message: policy.errors[0] || "Password does not meet the policy" },
          { status: 400 },
        )
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

      const invites = await dbQuery<any>(
        `SELECT id, email, name, role, expiresAt, usedAt
         FROM user_invitations
         WHERE tokenHash = ?
         LIMIT 1`,
        [tokenHash],
      )

      if (invites.length === 0) {
        return NextResponse.json({ success: false, message: "Invitation not found" }, { status: 404 })
      }

      const invite = invites[0]
      if (invite.usedAt) {
        return NextResponse.json({ success: false, message: "Invitation link has already been used" }, { status: 400 })
      }

      const expiresAt = new Date(invite.expiresAt)
      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
        return NextResponse.json({ success: false, message: "Invitation link has expired" }, { status: 400 })
      }

      const email = String(invite.email || payload.email)
      if (String(payload.email).toLowerCase() !== String(email).toLowerCase()) {
        return NextResponse.json({ success: false, message: "Invitation token mismatch" }, { status: 400 })
      }

      const role = String(invite.role || payload.role || "student")
      const finalName = (name || invite.name || payload.name || "").trim()
      if (!finalName) {
        return NextResponse.json({ success: false, message: "Name is required" }, { status: 400 })
      }

      const existingUser = await dbQuery<{ id: string }>("SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", [
        email,
      ])
      if (existingUser.length > 0) {
        return NextResponse.json(
          { success: false, message: "A user with this email already exists." },
          { status: 409 },
        )
      }

      const passwordHash = await bcrypt.hash(password, 10)
      await dbQuery(
        "INSERT INTO users (email, name, password, role, isActive) VALUES (?, ?, ?, ?, ?)",
        [email, finalName, passwordHash, role, 1],
      )

      const created = await dbQuery<any>(
        "SELECT id, email, name, role FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
        [email],
      )
      const user = created[0]

      await dbQuery("UPDATE user_invitations SET usedAt = NOW() WHERE id = ?", [String(invite.id)])

      const authToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        tokenSecret(),
        { expiresIn: "7d" },
      )

      return NextResponse.json(
        {
          success: true,
          message: "Registration successful",
          token: authToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        },
        { status: 201 },
      )
    }

    // Mode 2: self-registration (no token). Sends email verification link.
    const parsed = selfBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || "Invalid request" },
        { status: 400 },
      )
    }

    const { email, name, password } = parsed.data

    const policy = validatePasswordPolicy(password)
    if (!policy.isValid) {
      return NextResponse.json(
        { success: false, message: policy.errors[0] || "Password does not meet the policy" },
        { status: 400 },
      )
    }

    const existingUser = await dbQuery<{ id: string }>("SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", [
      email,
    ])
    if (existingUser.length > 0) {
      return NextResponse.json(
        { success: false, message: "A user with this email already exists." },
        { status: 409 },
      )
    }

    // Default: allow self-registration without requiring email verification.
    // If REQUIRE_EMAIL_VERIFICATION=true, we will send a verification link instead.
    if (!requireEmailVerification()) {
      const passwordHash = await bcrypt.hash(password, 10)
      await dbQuery(
        "INSERT INTO users (email, name, password, role, isActive) VALUES (?, ?, ?, ?, ?)",
        [email, name.trim(), passwordHash, "student", 1],
      )

      const created = await dbQuery<any>(
        "SELECT id, email, name, role FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
        [email],
      )
      const user = created[0]

      const authToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        tokenSecret(),
        { expiresIn: "7d" },
      )

      return NextResponse.json(
        {
          success: true,
          message: "Registration successful",
          token: authToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        },
        { status: 201 },
      )
    }

    await ensureUserPendingRegistrationsTable()

    const verifyToken = jwt.sign(
      { purpose: "email_verify", email },
      tokenSecret(),
      { expiresIn: "24h", jwtid: crypto.randomUUID() },
    )
    const verifyTokenHash = sha256Hex(verifyToken)
    const passwordHash = await bcrypt.hash(password, 10)

    // Replace any previous unused pending record for this email
    await dbQuery(
      "DELETE FROM user_pending_registrations WHERE LOWER(email) = LOWER(?) AND usedAt IS NULL",
      [email],
    )

    await dbQuery(
      `INSERT INTO user_pending_registrations (email, name, role, passwordHash, tokenHash, expiresAt)
       VALUES (?, ?, 'student', ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
      [email, name, passwordHash, verifyTokenHash],
    )

    const baseUrl = getBaseUrl(request)
    const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(verifyToken)}`

    const subject = "Verify your email"
    const text = `Thanks for registering.\n\nVerify your email here:\n${verifyUrl}\n\nThis link expires in 24 hours.`

    const emailResult = await sendEmail({ to: email, subject, text })
    if (!emailResult.ok) {
      return NextResponse.json(
        { success: false, message: emailResult.error || "Failed to send verification email" },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Registration received. Please check your email to verify your account.",
        ...(emailResult.mode === "dev_log" && process.env.NODE_ENV !== "production" ? { verifyUrl } : {}),
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[POST /api/auth/register]", error)
    const message = error instanceof Error ? error.message : "Failed to register"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
