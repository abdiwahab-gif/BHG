import jwt, { type JwtPayload } from "jsonwebtoken"
import { NextRequest } from "next/server"

export type AuthTokenPayload = JwtPayload & {
  userId?: string
  id?: string
  email?: string
  role?: string
}

function secret(): string {
  return process.env.JWT_SECRET || "your-secret-key-change-in-production"
}

export function getBearerToken(request: NextRequest): string | null {
  const raw = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!raw) return null
  const [scheme, token] = raw.split(" ")
  if (!scheme || scheme.toLowerCase() !== "bearer") return null
  if (!token) return null
  return token.trim() || null
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, secret())
    if (!decoded || typeof decoded !== "object") return null
    return decoded as AuthTokenPayload
  } catch {
    return null
  }
}

export function requireRole(request: NextRequest, allowedRoles: string[]) {
  const token = getBearerToken(request)
  if (!token) {
    return { ok: false as const, status: 401 as const, message: "Missing Authorization token" }
  }

  const payload = verifyAuthToken(token)
  if (!payload) {
    return { ok: false as const, status: 401 as const, message: "Invalid or expired token" }
  }

  const role = String(payload.role || "").toLowerCase()
  const allowed = allowedRoles.map((r) => r.toLowerCase())
  if (!allowed.includes(role)) {
    return { ok: false as const, status: 403 as const, message: "Forbidden" }
  }

  return {
    ok: true as const,
    token,
    payload,
    userId: String(payload.userId || payload.id || ""),
    email: payload.email ? String(payload.email) : undefined,
    role,
  }
}
