export type ClientUserLike = {
  id?: string | number
  email?: string
  name?: string
  firstName?: string
  lastName?: string
  role?: string
  userRole?: string
}

export function getClientUser(): ClientUserLike | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem("user")
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    return parsed as ClientUserLike
  } catch {
    return null
  }
}

export function getClientUserIdForAudit(): string {
  const user = getClientUser()
  if (!user) return ""

  if (user.id !== undefined && user.id !== null && String(user.id).trim()) return String(user.id).trim()
  if (typeof user.email === "string" && user.email.trim()) return user.email.trim()

  const displayName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || String(user.name || "").trim()
  return displayName
}

export function getAuditHeaders(): Record<string, string> {
  const user = getClientUser()
  const userId = getClientUserIdForAudit()

  if (!userId) return {}

  const userName = `${String(user?.firstName || "").trim()} ${String(user?.lastName || "").trim()}`.trim() ||
    String(user?.name || "").trim() ||
    String(user?.email || "").trim()

  const headers: Record<string, string> = { "x-user-id": userId }
  if (userName) headers["x-user-name"] = userName
  const role = String(user?.role || user?.userRole || "").trim()
  if (role) headers["x-user-role"] = role
  return headers
}
