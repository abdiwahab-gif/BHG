import { getAuditHeaders } from "@/lib/client-audit"

export function getClientAuthToken(): string {
  if (typeof window === "undefined") return ""
  try {
    return String(window.localStorage.getItem("token") || "").trim()
  } catch {
    return ""
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getClientAuthToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export function getAuthAndAuditHeaders(): Record<string, string> {
  return { ...getAuthHeaders(), ...getAuditHeaders() }
}
