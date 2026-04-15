import { type NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2/promise"
import { z } from "zod"
import { dbQuery } from "@/lib/db"
import { AuditLogger } from "@/lib/audit-logger"
import { ensureMembersTable, toMemberDto, type DbMemberRow } from "../_db"

export const runtime = "nodejs"

const updateMemberSchema = z.object({
  photo: z.string().optional().or(z.literal("")),
  fullName: z.string().trim().min(2).max(255),
  gender: z.enum(["male", "female"]),
  mobileNumber: z.string().trim().min(7).max(50),
  email: z.string().trim().email().max(255),
  deggen: z.string().trim().min(2).max(255),
  shaqada: z.string().trim().min(2).max(150),
  masuulkaaga: z.string().trim().min(2).max(255),
})

function toMemberAuditValues(row: DbMemberRow) {
  const dto = toMemberDto(row)
  const hasPhoto = Boolean(dto.photo)
  return {
    ...dto,
    photo: hasPhoto ? "[photo]" : "",
    hasPhoto,
  }
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureMembersTable()

    const id = String(params.id || "").trim()
    if (!id) return NextResponse.json({ error: "Member id is required" }, { status: 400 })

    const rows = await dbQuery<DbMemberRow & RowDataPacket>(
      "SELECT id, fullName, gender, mobileNumber, email, deggen, shaqada, masuulkaaga, photo, createdAt, updatedAt FROM academic_module_members WHERE id = ? LIMIT 1",
      [id],
    )

    if (!rows?.[0]) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, member: toMemberDto(rows[0] as DbMemberRow) })
  } catch (error) {
    console.error("Error fetching member:", error)
    return NextResponse.json({ error: "Failed to fetch member" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureMembersTable()

    const actorId = request.headers.get("x-user-id")
    const actorRole = request.headers.get("x-user-role") || ""
    const actorName = request.headers.get("x-user-name") || ""
    if (!actorId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const id = String(params.id || "").trim()
    if (!id) return NextResponse.json({ error: "Member id is required" }, { status: 400 })

    const beforeRows = await dbQuery<DbMemberRow & RowDataPacket>(
      "SELECT id, fullName, gender, mobileNumber, email, deggen, shaqada, masuulkaaga, photo, createdAt, updatedAt FROM academic_module_members WHERE id = ? LIMIT 1",
      [id],
    )
    if (!beforeRows?.[0]) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    const parsed = updateMemberSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid member", details: parsed.error.errors }, { status: 400 })
    }

    const email = parsed.data.email.trim()
    const emailExists = await dbQuery<RowDataPacket & { id: string }>(
      "SELECT id FROM academic_module_members WHERE LOWER(email) = LOWER(?) AND id <> ? LIMIT 1",
      [email, id],
    )
    if (emailExists.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    await dbQuery(
      `UPDATE academic_module_members
       SET fullName = ?, gender = ?, mobileNumber = ?, email = ?, deggen = ?, shaqada = ?, masuulkaaga = ?, photo = NULLIF(?, '')
       WHERE id = ?`,
      [
        parsed.data.fullName,
        parsed.data.gender,
        parsed.data.mobileNumber,
        email,
        parsed.data.deggen,
        parsed.data.shaqada,
        parsed.data.masuulkaaga,
        parsed.data.photo || "",
        id,
      ],
    )

    const rows = await dbQuery<DbMemberRow & RowDataPacket>(
      "SELECT id, fullName, gender, mobileNumber, email, deggen, shaqada, masuulkaaga, photo, createdAt, updatedAt FROM academic_module_members WHERE id = ? LIMIT 1",
      [id],
    )

    const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"
    await AuditLogger.log({
      userId: actorId,
      userRole: String(actorRole),
      userName: String(actorName),
      action: "UPDATE",
      entityType: "MEMBER",
      entityId: id,
      oldValues: toMemberAuditValues(beforeRows[0] as DbMemberRow),
      newValues: rows?.[0] ? toMemberAuditValues(rows[0] as DbMemberRow) : undefined,
      ipAddress: String(ipAddress),
      userAgent: String(userAgent),
    }).catch(() => undefined)

    return NextResponse.json({ success: true, member: rows[0] ? toMemberDto(rows[0] as DbMemberRow) : null })
  } catch (error) {
    console.error("Error updating member:", error)
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureMembersTable()

    const actorId = request.headers.get("x-user-id")
    const actorRole = request.headers.get("x-user-role") || ""
    const actorName = request.headers.get("x-user-name") || ""
    if (!actorId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const id = String(params.id || "").trim()
    if (!id) return NextResponse.json({ error: "Member id is required" }, { status: 400 })

    const beforeRows = await dbQuery<DbMemberRow & RowDataPacket>(
      "SELECT id, fullName, gender, mobileNumber, email, deggen, shaqada, masuulkaaga, photo, createdAt, updatedAt FROM academic_module_members WHERE id = ? LIMIT 1",
      [id],
    )

    if (!beforeRows?.[0]) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    await dbQuery("DELETE FROM academic_module_members WHERE id = ?", [id])

    const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"
    await AuditLogger.log({
      userId: actorId,
      userRole: String(actorRole),
      userName: String(actorName),
      action: "DELETE",
      entityType: "MEMBER",
      entityId: id,
      oldValues: toMemberAuditValues(beforeRows[0] as DbMemberRow),
      ipAddress: String(ipAddress),
      userAgent: String(userAgent),
    }).catch(() => undefined)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting member:", error)
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 })
  }
}
