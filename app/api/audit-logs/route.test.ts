import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/audit-logger", () => ({
  AuditLogger: {
    getAuditLogs: vi.fn(),
  },
}))

import { AuditLogger } from "@/lib/audit-logger"
import { AuthService } from "@/lib/auth"
import { GET } from "./route"

function makeRequest(url = "http://localhost:3000/api/audit-logs", headers: Record<string, string> = {}): Request {
  return new Request(url, {
    method: "GET",
    headers,
  })
}

describe("/api/audit-logs authorization", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns 401 when x-user-id header is missing", async () => {
    const response = await GET(makeRequest() as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Authentication required")
  })

  it("returns 403 for role without audit_logs:read permission", async () => {
    const response = await GET(
      makeRequest("http://localhost:3000/api/audit-logs", {
        "x-user-id": "s-1",
        "x-user-role": "student",
        "x-user-name": "Student User",
      }) as any,
    )
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("Insufficient permissions")
  })

  it("forces teacher scope to own userId before querying logs", async () => {
    const getAuditLogsMock = vi.mocked(AuditLogger.getAuditLogs)
    getAuditLogsMock.mockResolvedValue({ logs: [], total: 0 })
    vi.spyOn(AuthService, "hasPermission").mockReturnValue(true)

    const response = await GET(
      makeRequest("http://localhost:3000/api/audit-logs?userId=other-user&page=2&limit=10", {
        "x-user-id": "teacher-123",
        "x-user-role": "teacher",
        "x-user-name": "Teacher User",
      }) as any,
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(getAuditLogsMock).toHaveBeenCalledTimes(1)

    const [filters] = getAuditLogsMock.mock.calls[0]
    expect(filters.userId).toBe("teacher-123")
    expect(filters.page).toBe(2)
    expect(filters.limit).toBe(10)
  })

  it("returns 500 when log query throws unexpectedly", async () => {
    const getAuditLogsMock = vi.mocked(AuditLogger.getAuditLogs)
    getAuditLogsMock.mockRejectedValue(new Error("db unavailable"))

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const response = await GET(
      makeRequest("http://localhost:3000/api/audit-logs", {
        "x-user-id": "admin-1",
        "x-user-role": "admin",
        "x-user-name": "Admin User",
      }) as any,
    )
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Failed to fetch audit logs")
    expect(consoleSpy).toHaveBeenCalled()
  })
})
