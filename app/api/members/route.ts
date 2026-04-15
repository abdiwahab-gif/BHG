import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { dbQuery } from "@/lib/db"
import { ensureMembersTable, toMemberDto, type DbMemberRow } from "./_db"

export const runtime = "nodejs"

const createMemberSchema = z.object({
  photo: z.string().optional().or(z.literal("")),
  fullName: z.string().trim().min(2).max(255),
  gender: z.enum(["male", "female"]),
  mobileNumber: z.string().trim().min(7).max(50),
  email: z.string().trim().email().max(255),
  deggen: z.string().trim().min(2).max(255),
  shaqada: z.string().trim().min(2).max(150),
  masuulkaaga: z.string().trim().min(2).max(255),
})

export async function GET(request: NextRequest) {
  try {
    await ensureMembersTable()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.trim() || ""
    const location = searchParams.get("location")?.trim() || ""
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50
    const safePage = Number.isFinite(page) && page > 0 ? page : 1
    const offset = (safePage - 1) * safeLimit

    const where: string[] = []
    const params: unknown[] = []

    if (search) {
      const like = `%${search}%`
      where.push("(fullName LIKE ? OR email LIKE ? OR mobileNumber LIKE ?)")
      params.push(like, like, like)
    }

    if (location) {
      const allowed = new Set(["Borama", "Wajaale", "Hargeisa", "Other"])
      if (!allowed.has(location)) {
        return NextResponse.json({ error: "Invalid location filter" }, { status: 400 })
      }

      if (location === "Other") {
        where.push("(LOWER(deggen) NOT IN (?,?,?) AND deggen <> '')")
        params.push("borama", "wajaale", "hargeisa")
      } else {
        where.push("LOWER(deggen) = LOWER(?)")
        params.push(location)
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const countRows = await dbQuery<RowDataPacket & { total: number }>(
      `SELECT COUNT(*) as total FROM academic_module_members ${whereSql}`,
      params,
    )
    const total = Number(countRows?.[0]?.total || 0)
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, safeLimit)))
    const pageClamped = Math.min(Math.max(1, safePage), totalPages)
    const offsetClamped = (pageClamped - 1) * safeLimit

    const rows = await dbQuery<DbMemberRow & RowDataPacket>(
      `SELECT id, fullName, gender, mobileNumber, email, deggen, shaqada, masuulkaaga, photo, createdAt, updatedAt
       FROM academic_module_members
       ${whereSql}
       ORDER BY createdAt DESC
       LIMIT ${offsetClamped}, ${safeLimit}`,
      params,
    )

    return NextResponse.json({
      success: true,
      members: (rows || []).map((r) => toMemberDto(r as DbMemberRow)),
      pagination: { page: pageClamped, limit: safeLimit, total, totalPages },
    })
  } catch (error) {
    console.error("Error fetching members:", error)
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureMembersTable()

    const parsed = createMemberSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid member", details: parsed.error.errors }, { status: 400 })
    }

    const email = parsed.data.email.trim()
    const existing = await dbQuery<RowDataPacket & { id: string }>(
      "SELECT id FROM academic_module_members WHERE LOWER(email) = LOWER(?) LIMIT 1",
      [email],
    )
    if (existing.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const id = crypto.randomUUID()
    await dbQuery(
      `INSERT INTO academic_module_members (
        id, fullName, gender, mobileNumber, email, deggen, shaqada, masuulkaaga, photo
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, '')
      )`,
      [
        id,
        parsed.data.fullName,
        parsed.data.gender,
        parsed.data.mobileNumber,
        email,
        parsed.data.deggen,
        parsed.data.shaqada,
        parsed.data.masuulkaaga,
        parsed.data.photo || "",
      ],
    )

    const rows = await dbQuery<DbMemberRow>(
      "SELECT id, fullName, gender, mobileNumber, email, deggen, shaqada, masuulkaaga, photo, createdAt, updatedAt FROM academic_module_members WHERE id = ? LIMIT 1",
      [id],
    )

    return NextResponse.json({ success: true, member: rows[0] ? toMemberDto(rows[0]) : null })
  } catch (error) {
    console.error("Error creating member:", error)
    return NextResponse.json({ error: "Failed to register member" }, { status: 500 })
  }
}
