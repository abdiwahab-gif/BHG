import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import jwt from "jsonwebtoken"
import crypto from "crypto"

import { dbQuery } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { ensureUserInvitationsTable } from "./_db"
import { requireRole } from "@/lib/server-auth"

const bodySchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(255).optional(),
  role: z.enum(["admin", "teacher", "student", "department_head", "super_admin"]).default("student"),
})

function tokenSecret(): string {
  return process.env.JWT_SECRET || "your-secret-key-change-in-production"
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex")
}

function getBaseUrl(request: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL
  if (explicit && /^https?:\/\//i.test(explicit)) return explicit.replace(/\/$/, "")

  const proto = request.headers.get("x-forwarded-proto") || "http"
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  if (host) return `${proto}://${host}`
  return "http://localhost:3000"
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ["admin", "super_admin"])
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const body = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || "Invalid request" },
        { status: 400 },
      )
    }

    await ensureUserInvitationsTable()

    const { email, name, role } = parsed.data

    const existing = await dbQuery<{ id: string }>("SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", [
      email,
    ])
    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: "A user with this email already exists." },
        { status: 409 },
      )
    }

    const token = jwt.sign(
      {
        purpose: "user_invite",
        email,
        name: name || undefined,
        role,
      },
      tokenSecret(),
      { expiresIn: "48h", jwtid: crypto.randomUUID() },
    )

    const tokenHash = sha256Hex(token)

    // Store invitation
    await dbQuery(
      `INSERT INTO user_invitations (email, name, role, tokenHash, expiresAt)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 48 HOUR))`,
      [email, name || null, role, tokenHash],
    )

    const baseUrl = getBaseUrl(request)
    const inviteUrl = `${baseUrl}/register?token=${encodeURIComponent(token)}`

    const subject = "You're invited to Academic Management"
    const text = `You have been invited to register an account.\n\nComplete registration here:\n${inviteUrl}\n\nThis link expires in 48 hours.`

    const emailResult = await sendEmail({ to: email, subject, text })
    if (!emailResult.ok) {
      return NextResponse.json(
        { success: false, message: emailResult.error || "Failed to send email" },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Invitation sent successfully",
        ...(emailResult.mode === "dev_log" && process.env.NODE_ENV !== "production" ? { inviteUrl } : {}),
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[POST /api/auth/invitations]", error)
    const message = error instanceof Error ? error.message : "Failed to create invitation"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
