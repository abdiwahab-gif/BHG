import { describe, expect, it } from "vitest"
import { POST } from "./route"

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/reports/analytics/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

describe("/api/reports/analytics/export authorization", () => {
  it("returns 401 when x-user-id is missing", async () => {
    const response = await POST(
      makeRequest({
        reportType: "grade_distribution",
        format: "csv",
      }) as any,
    )
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Authentication required")
  })

  it("returns 403 for non-admin and non-department_head roles", async () => {
    const response = await POST(
      makeRequest(
        {
          reportType: "grade_distribution",
          format: "csv",
        },
        {
          "x-user-id": "teacher-1",
          "x-user-role": "teacher",
        },
      ) as any,
    )
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("Insufficient permissions")
  })

  it("returns downloadable CSV for admin", async () => {
    const response = await POST(
      makeRequest(
        {
          reportType: "grade_distribution",
          format: "csv",
        },
        {
          "x-user-id": "admin-1",
          "x-user-role": "admin",
        },
      ) as any,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toContain("text/csv")
    expect(response.headers.get("Content-Disposition")).toContain("attachment; filename=\"grade_distribution-")

    const content = await response.text()
    expect(content).toContain("grade,count,percentage")
  })

  it("returns 400 for invalid report payload", async () => {
    const response = await POST(
      makeRequest(
        {
          reportType: "invalid_type",
          format: "csv",
        },
        {
          "x-user-id": "admin-1",
          "x-user-role": "admin",
        },
      ) as any,
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Invalid parameters")
  })
})
