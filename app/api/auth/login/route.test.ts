import { afterEach, describe, expect, it, vi } from "vitest"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { dbQuery } from "@/lib/db"
import { POST } from "./route"

vi.mock("@/lib/db", () => ({
  dbQuery: vi.fn(),
}))

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}))

function makeJsonRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

async function parseResponse(response: Response) {
  const data = await response.json()
  return { status: response.status, data }
}

describe("/api/auth/login - suite 2", () => {
  const originalJwtSecret = process.env.JWT_SECRET

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret
    vi.restoreAllMocks()
  })

  const mockDbQuery = vi.mocked(dbQuery)
  const mockBcryptCompare = vi.mocked(bcrypt.compare)

  describe("success path", () => {
    it("returns 200 with token and admin user for valid admin credentials", async () => {
      process.env.JWT_SECRET = "test-secret"
      mockDbQuery.mockResolvedValueOnce([
        {
          id: "1",
          email: "admin@academic.edu",
          password: "$2a$10$hash",
          name: "Admin User",
          role: "admin",
          isActive: true,
        } as any,
      ])
      mockBcryptCompare.mockResolvedValueOnce(true as never)

      const response = await POST(makeJsonRequest({ email: "admin@academic.edu", password: "admin123" }) as any)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe("Login successful")
      expect(data.token).toEqual(expect.any(String))
      expect(data.user).toMatchObject({
        id: "1",
        email: "admin@academic.edu",
        name: "Admin User",
        role: "admin",
      })
      expect(data.user.password).toBeUndefined()
    })

    it("returns teacher role payload for teacher credentials", async () => {
      mockDbQuery.mockResolvedValueOnce([
        {
          id: "2",
          email: "teacher@academic.edu",
          password: "$2a$10$hash",
          name: "John Teacher",
          role: "teacher",
          isActive: true,
        } as any,
      ])
      mockBcryptCompare.mockResolvedValueOnce(true as never)

      const response = await POST(makeJsonRequest({ email: "teacher@academic.edu", password: "teacher123" }) as any)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.role).toBe("teacher")
      expect(data.user.email).toBe("teacher@academic.edu")
    })

    it("returns student role payload for student credentials", async () => {
      mockDbQuery.mockResolvedValueOnce([
        {
          id: "3",
          email: "student@academic.edu",
          password: "$2a$10$hash",
          name: "Jane Student",
          role: "student",
          isActive: true,
        } as any,
      ])
      mockBcryptCompare.mockResolvedValueOnce(true as never)

      const response = await POST(makeJsonRequest({ email: "student@academic.edu", password: "student123" }) as any)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.role).toBe("student")
      expect(data.user.email).toBe("student@academic.edu")
    })
  })

  describe("validation failures", () => {
    it("returns 400 when email is missing", async () => {
      const response = await POST(makeJsonRequest({ password: "admin123" }) as any)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe("Email and password are required")
    })

    it("returns 400 when password is missing", async () => {
      const response = await POST(makeJsonRequest({ email: "admin@academic.edu" }) as any)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe("Email and password are required")
    })

    it("returns 400 when both fields are missing", async () => {
      const response = await POST(makeJsonRequest({}) as any)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe("Email and password are required")
    })

    it("returns 400 for empty email and password", async () => {
      const response = await POST(makeJsonRequest({ email: "", password: "" }) as any)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe("Email and password are required")
    })

    it("returns 500 for malformed JSON body", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const request = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{invalid-json",
      })

      const response = await POST(request as any)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe("Internal server error")
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe("authentication failures", () => {
    it("returns 401 for wrong password", async () => {
      mockDbQuery.mockResolvedValueOnce([
        {
          id: "1",
          email: "admin@academic.edu",
          password: "$2a$10$hash",
          name: "Admin User",
          role: "admin",
          isActive: true,
        } as any,
      ])
      mockBcryptCompare.mockResolvedValueOnce(false as never)

      const response = await POST(makeJsonRequest({ email: "admin@academic.edu", password: "wrongpass" }) as any)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe("Invalid email or password")
    })

    it("returns 401 for unknown email", async () => {
      mockDbQuery.mockResolvedValueOnce([] as any)

      const response = await POST(makeJsonRequest({ email: "unknown@academic.edu", password: "admin123" }) as any)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe("Invalid email or password")
    })

    it("returns 401 for injection-like credentials without crashing", async () => {
      mockDbQuery.mockResolvedValueOnce([] as any)

      const response = await POST(
        makeJsonRequest({
          email: "' OR 1=1 --@academic.edu",
          password: "' OR '1'='1",
        }) as any,
      )
      const { status, data } = await parseResponse(response)

      expect(status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe("Invalid email or password")
    })
  })

  describe("JWT contract", () => {
    it("includes expected claims and ~7 day expiry", async () => {
      process.env.JWT_SECRET = "test-secret"
      mockDbQuery.mockResolvedValueOnce([
        {
          id: "1",
          email: "admin@academic.edu",
          password: "$2a$10$hash",
          name: "Admin User",
          role: "admin",
          isActive: true,
        } as any,
      ])
      mockBcryptCompare.mockResolvedValueOnce(true as never)

      const response = await POST(makeJsonRequest({ email: "admin@academic.edu", password: "admin123" }) as any)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(200)

      const decoded = jwt.verify(data.token, "test-secret") as jwt.JwtPayload

      expect(decoded.userId).toBe("1")
      expect(decoded.email).toBe("admin@academic.edu")
      expect(decoded.role).toBe("admin")
      expect(typeof decoded.iat).toBe("number")
      expect(typeof decoded.exp).toBe("number")

      const lifetimeInSeconds = (decoded.exp as number) - (decoded.iat as number)
      const expectedSevenDays = 7 * 24 * 60 * 60
      expect(lifetimeInSeconds).toBeGreaterThanOrEqual(expectedSevenDays - 5)
      expect(lifetimeInSeconds).toBeLessThanOrEqual(expectedSevenDays + 5)
    })

    it("fails verification with incorrect secret", async () => {
      process.env.JWT_SECRET = "test-secret"
      mockDbQuery.mockResolvedValueOnce([
        {
          id: "2",
          email: "teacher@academic.edu",
          password: "$2a$10$hash",
          name: "John Teacher",
          role: "teacher",
          isActive: true,
        } as any,
      ])
      mockBcryptCompare.mockResolvedValueOnce(true as never)

      const response = await POST(makeJsonRequest({ email: "teacher@academic.edu", password: "teacher123" }) as any)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(200)
      expect(() => jwt.verify(data.token, "wrong-secret")).toThrow()
    })

    it("never returns password/hash fields in response user payload", async () => {
      mockDbQuery.mockResolvedValueOnce([
        {
          id: "2",
          email: "teacher@academic.edu",
          password: "$2a$10$hash",
          name: "John Teacher",
          role: "teacher",
          isActive: true,
        } as any,
      ])
      mockBcryptCompare.mockResolvedValueOnce(true as never)

      const response = await POST(makeJsonRequest({ email: "teacher@academic.edu", password: "teacher123" }) as any)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(200)
      expect(data.user.password).toBeUndefined()
      expect(data.user.passwordHash).toBeUndefined()
      expect(Object.keys(data.user)).toEqual(expect.arrayContaining(["id", "email", "name", "role"]))
    })

    it("returns 401 for inactive user", async () => {
      mockDbQuery.mockResolvedValueOnce([
        {
          id: "4",
          email: "inactive@academic.edu",
          password: "$2a$10$hash",
          name: "Inactive User",
          role: "teacher",
          isActive: false,
        } as any,
      ])

      const response = await POST(makeJsonRequest({ email: "inactive@academic.edu", password: "anypass" }) as any)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe("Invalid email or password")
    })
  })
})
