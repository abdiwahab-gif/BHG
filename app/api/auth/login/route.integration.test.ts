import { afterAll, beforeAll, describe, expect, it } from "vitest"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { type Pool, type ResultSetHeader } from "mysql2/promise"
import { getDbPool } from "@/lib/db"
import { POST } from "./route"

const shouldRunIntegration = process.env.RUN_DB_INTEGRATION_TESTS === "true"
const describeIf = shouldRunIntegration ? describe : describe.skip

const runId = Date.now().toString(36)
const activeEmail = `integration.active.${runId}@academic.local`
const inactiveEmail = `integration.inactive.${runId}@academic.local`
const activePassword = "P@ssw0rd!123"
const inactivePassword = "P@ssw0rd!456"

let pool: Pool

function makeJsonRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var for integration tests: ${name}`)
  }
  return value
}

describeIf("/api/auth/login - MySQL integration", () => {
  beforeAll(async () => {
    requireEnv("DB_HOST")
    requireEnv("DB_USER")
    requireEnv("DB_NAME")

    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = "integration-test-secret"
    }

    pool = getDbPool()
    await pool.query("SELECT 1")

    const activePasswordHash = await bcrypt.hash(activePassword, 10)
    const inactivePasswordHash = await bcrypt.hash(inactivePassword, 10)

    await pool.execute<ResultSetHeader>(
      "INSERT INTO users (email, password, name, role, isActive) VALUES (?, ?, ?, ?, ?)",
      [activeEmail, activePasswordHash, "Integration Active User", "teacher", true],
    )

    await pool.execute<ResultSetHeader>(
      "INSERT INTO users (email, password, name, role, isActive) VALUES (?, ?, ?, ?, ?)",
      [inactiveEmail, inactivePasswordHash, "Integration Inactive User", "teacher", false],
    )
  })

  afterAll(async () => {
    await pool.execute<ResultSetHeader>("DELETE FROM users WHERE email IN (?, ?)", [activeEmail, inactiveEmail])
    await pool.end()
    global.__mysqlPool = undefined
  })

  it("authenticates an active user and returns a valid JWT", async () => {
    const response = await POST(makeJsonRequest({ email: activeEmail, password: activePassword }) as any)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.message).toBe("Login successful")
    expect(body.token).toEqual(expect.any(String))
    expect(body.user.email).toBe(activeEmail)
    expect(body.user.role).toBe("teacher")
    expect(body.user.password).toBeUndefined()

    const decoded = jwt.verify(body.token, process.env.JWT_SECRET as string) as jwt.JwtPayload
    expect(decoded.email).toBe(activeEmail)
    expect(decoded.role).toBe("teacher")
    expect(decoded.userId).toBeDefined()
  })

  it("rejects wrong password with 401", async () => {
    const response = await POST(makeJsonRequest({ email: activeEmail, password: "wrong-password" }) as any)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.message).toBe("Invalid email or password")
  })

  it("rejects inactive user with 401", async () => {
    const response = await POST(makeJsonRequest({ email: inactiveEmail, password: inactivePassword }) as any)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.message).toBe("Invalid email or password")
  })
})
