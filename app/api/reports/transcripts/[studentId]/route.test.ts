import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/audit-logger", () => ({
  AuditLogger: {
    logTranscriptGeneration: vi.fn().mockResolvedValue(undefined),
  },
}))

import { GET } from "./route"

function makeRequest(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, {
    method: "GET",
    headers,
  })
}

describe("/api/reports/transcripts/[studentId] authorization", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("returns 401 when x-user-id header is missing", async () => {
    const response = await GET(
      makeRequest("http://localhost:3000/api/reports/transcripts/student-1?format=json") as any,
      { params: { studentId: "student-1" } },
    )
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe("Authentication required")
  })

  it("returns 403 when student requests another student's transcript", async () => {
    const response = await GET(
      makeRequest("http://localhost:3000/api/reports/transcripts/student-2?format=json", {
        "x-user-id": "student-1",
        "x-user-role": "student",
        "x-user-name": "Student One",
      }) as any,
      { params: { studentId: "student-2" } },
    )
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe("Access denied")
  })

  it("allows student to fetch own transcript as JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          student: { id: "student-1", name: "Student One", studentNumber: "2024001" },
          academic: { currentGPA: 3.4, cumulativeGPA: 3.3, totalCreditsEarned: 90, totalCreditsRequired: 120 },
          courses: [],
        }),
      }),
    )

    const response = await GET(
      makeRequest("http://localhost:3000/api/reports/transcripts/student-1?format=json", {
        "x-user-id": "student-1",
        "x-user-role": "student",
        "x-user-name": "Student One",
      }) as any,
      { params: { studentId: "student-1" } },
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.student.id).toBe("student-1")
    expect(data.data.generatedBy).toBe("Student One")
  })

  it("currently rejects boolean query-string values due strict schema parsing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          student: { id: "student-1", name: "Student One", studentNumber: "2024001" },
          academic: { currentGPA: 3.4, cumulativeGPA: 3.3, totalCreditsEarned: 90, totalCreditsRequired: 120 },
          courses: [],
        }),
      }),
    )

    const adminResponse = await GET(
      makeRequest("http://localhost:3000/api/reports/transcripts/student-1?format=json&officialSeal=true", {
        "x-user-id": "admin-1",
        "x-user-role": "admin",
        "x-user-name": "Admin",
      }) as any,
      { params: { studentId: "student-1" } },
    )
    const adminData = await adminResponse.json()

    const teacherResponse = await GET(
      makeRequest("http://localhost:3000/api/reports/transcripts/student-1?format=json&officialSeal=true", {
        "x-user-id": "teacher-1",
        "x-user-role": "teacher",
        "x-user-name": "Teacher",
      }) as any,
      { params: { studentId: "student-1" } },
    )
    const teacherData = await teacherResponse.json()

    expect(adminResponse.status).toBe(400)
    expect(teacherResponse.status).toBe(400)
    expect(adminData.error).toBe("Invalid parameters")
    expect(teacherData.error).toBe("Invalid parameters")
  })
})
