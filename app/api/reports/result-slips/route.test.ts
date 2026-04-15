import { describe, expect, it } from "vitest"
import { POST } from "./route"

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/reports/result-slips", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

describe("/api/reports/result-slips authorization baseline", () => {
  it("returns 401 when x-user-id header is missing", async () => {
    const response = await POST(
      makeRequest({
        studentIds: ["s-1"],
        sessionId: "session-1",
        format: "json",
      }) as any,
    )
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Authentication required")
  })

  it("returns 400 for invalid payload", async () => {
    const response = await POST(
      makeRequest(
        {
          studentIds: [],
          sessionId: "",
          format: "json",
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

  it("currently allows authenticated teacher to generate result slips", async () => {
    const response = await POST(
      makeRequest(
        {
          studentIds: ["s-1", "s-2"],
          sessionId: "session-1",
          format: "json",
        },
        {
          "x-user-id": "teacher-1",
          "x-user-role": "teacher",
        },
      ) as any,
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.data).toHaveLength(2)
  })
})
