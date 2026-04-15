import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { dbQuery } from "@/lib/db"
import { ensureDonationsTable, toDonationDto, type DbDonationRow } from "./_db"

export const runtime = "nodejs"

const createDonationSchema = z.object({
  amount: z.preprocess(
    (v) => {
      if (typeof v === "number") return v
      if (typeof v === "string") return Number.parseFloat(v)
      return v
    },
    z.number().finite().positive(),
  ),
  donorName: z.string().trim().max(255).optional().default(""),
  mobileNumber: z.string().trim().max(50).optional().default(""),
  email: z.string().trim().email().max(255).optional().or(z.literal("")).default(""),
  note: z.string().trim().max(2000).optional().default(""),
})

export async function GET(request: NextRequest) {
  try {
    await ensureDonationsTable()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")?.trim() || ""
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50
    const safePage = Number.isFinite(page) && page > 0 ? page : 1
    const offset = (safePage - 1) * safeLimit

    const where: string[] = []
    const params: unknown[] = []
    if (status) {
      where.push("status = ?")
      params.push(status)
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const countRows = await dbQuery<RowDataPacket & { total: number }>(
      `SELECT COUNT(*) as total FROM academic_module_donations ${whereSql}`,
      params,
    )
    const total = Number(countRows?.[0]?.total || 0)
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, safeLimit)))
    const pageClamped = Math.min(Math.max(1, safePage), totalPages)
    const offsetClamped = (pageClamped - 1) * safeLimit

    const rows = await dbQuery<DbDonationRow & RowDataPacket>(
      `SELECT id, amount, donorName, mobileNumber, email, note, status, createdAt
       FROM academic_module_donations
       ${whereSql}
       ORDER BY createdAt DESC
       LIMIT ${offsetClamped}, ${safeLimit}`,
      params,
    )

    return NextResponse.json({
      success: true,
      donations: (rows || []).map((r) => toDonationDto(r as DbDonationRow)),
      pagination: { page: pageClamped, limit: safeLimit, total, totalPages },
    })
  } catch (error) {
    console.error("Error fetching donations:", error)
    return NextResponse.json({ error: "Failed to fetch donations" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDonationsTable()

    const parsed = createDonationSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid donation", details: parsed.error.errors }, { status: 400 })
    }

    const id = crypto.randomUUID()
    await dbQuery(
      `INSERT INTO academic_module_donations (
        id, amount, donorName, mobileNumber, email, note, status
      ) VALUES (
        ?, ?, NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), 'PLEDGED'
      )`,
      [id, parsed.data.amount, parsed.data.donorName, parsed.data.mobileNumber, parsed.data.email, parsed.data.note],
    )

    const rows = await dbQuery<DbDonationRow & RowDataPacket>(
      "SELECT id, amount, donorName, mobileNumber, email, note, status, createdAt FROM academic_module_donations WHERE id = ? LIMIT 1",
      [id],
    )

    return NextResponse.json({ success: true, donation: rows[0] ? toDonationDto(rows[0]) : null })
  } catch (error) {
    console.error("Error creating donation:", error)
    return NextResponse.json({ error: "Failed to submit donation" }, { status: 500 })
  }
}
