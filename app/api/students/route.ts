import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import bcrypt from "bcryptjs"
import { dbQuery } from "@/lib/db"
import {
  type DbStudentRow,
  ensureStudentsTable,
  generateStudentIdFromSequence,
  resolveStudentsPhysicalTableName,
  toStudentDto,
} from "./_db"

async function getOptionalMetaSelect(): Promise<string> {
  try {
    const rows = await dbQuery<any>(
      "SELECT COLUMN_NAME as name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'academic_module_students' AND COLUMN_NAME IN ('program','faculty','department')",
      [],
    )
    const names = new Set((rows || []).map((r: any) => String(r.name)))
    const program = names.has("program") ? "program" : "NULL as program"
    const faculty = names.has("faculty") ? "faculty" : "NULL as faculty"
    const department = names.has("department") ? "department" : "NULL as department"
    return `, ${program}, ${faculty}, ${department}`
  } catch {
    return ", NULL as program, NULL as faculty, NULL as department"
  }
}

// GET /api/students - Get all students with optional filtering
export async function GET(request: NextRequest) {
  try {
    await ensureStudentsTable()

    const metaSelect = await getOptionalMetaSelect()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const classFilter = searchParams.get("class")
    const sectionFilter = searchParams.get("section")
    const genderFilter = searchParams.get("gender")
    const statusFilter = searchParams.get("status")
    const bloodTypeFilter = searchParams.get("bloodType")
    const nationalityFilter = searchParams.get("nationality")
    const cityFilter = searchParams.get("city")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    const safePage = Number.isFinite(page) && page > 0 ? page : 1
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 10

    const where: string[] = []
    const params: unknown[] = []

    if (search) {
      const like = `%${search}%`
      where.push(
        "(firstName LIKE ? OR lastName LIKE ? OR email LIKE ? OR phone LIKE ? OR studentId LIKE ?)",
      )
      params.push(like, like, like, like, like)
    }

    if (classFilter && classFilter !== "all") {
      where.push("className = ?")
      params.push(classFilter)
    }

    if (sectionFilter && sectionFilter !== "all") {
      where.push("sectionName = ?")
      params.push(sectionFilter)
    }

    if (genderFilter && genderFilter !== "all") {
      where.push("gender = ?")
      params.push(genderFilter)
    }

    if (statusFilter && statusFilter !== "all") {
      where.push("status = ?")
      params.push(statusFilter)
    }

    if (bloodTypeFilter) {
      where.push("bloodType = ?")
      params.push(bloodTypeFilter)
    }

    if (nationalityFilter) {
      where.push("nationality = ?")
      params.push(nationalityFilter)
    }

    if (cityFilter) {
      where.push("city = ?")
      params.push(cityFilter)
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const countRows = await dbQuery<any>(
      `SELECT COUNT(*) as total FROM academic_module_students ${whereSql}`,
      params,
    )
    const total = Number(countRows?.[0]?.total || 0)
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, safeLimit)))
    const pageClamped = Math.min(Math.max(1, safePage), totalPages)
    const offset = (pageClamped - 1) * safeLimit

    const rows = await dbQuery<any>(
      `SELECT 
        id, firstName, lastName, email, phone, className, sectionName, photo, status, gender,
        enrollmentDate, studentId, bloodType, nationality, religion, address, address2, city, zip,
        fatherName, motherName, fatherPhone, motherPhone, fatherOccupation, motherOccupation,
        fatherEmail, motherEmail, emergencyContact, medicalConditions, allergies, previousSchool,
        transferReason, birthday, idCardNumber, boardRegistrationNo${metaSelect}, createdAt, updatedAt
      FROM academic_module_students
      ${whereSql}
      ORDER BY createdAt DESC
      LIMIT ${offset}, ${safeLimit}`,
      params,
    )

    const students = (rows || []).map((r: any) => toStudentDto(r as DbStudentRow))

    return NextResponse.json({
      students,
      pagination: {
        page: pageClamped,
        limit: safeLimit,
        total,
        totalPages,
      },
      filters: {
        search,
        class: classFilter,
        section: sectionFilter,
        gender: genderFilter,
        status: statusFilter,
        bloodType: bloodTypeFilter || undefined,
        nationality: nationalityFilter || undefined,
        city: cityFilter || undefined,
      },
    })
  } catch (error) {
    console.error("Error fetching students:", error)
    const details = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        error: "Failed to fetch students",
        details: process.env.API_DEBUG_ERRORS === "true" ? details : undefined,
      },
      { status: 500 },
    )
  }
}

// POST /api/students - Create a new student
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    await ensureStudentsTable()

    const studentsTable = await resolveStudentsPhysicalTableName()

    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "class",
      "section",
      "gender",
      "bloodType",
      "nationality",
      "religion",
      "address",
      "city",
      "zip",
      "fatherName",
      "motherName",
      "fatherPhone",
      "motherPhone",
      "emergencyContact",
    ]

    const missingFields = requiredFields.filter((field) => !body[field])
    if (missingFields.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missingFields.join(", ")}` }, { status: 400 })
    }

    const email = String(body.email).trim()
    const existing = await dbQuery<any>(
      `SELECT id FROM ${studentsTable} WHERE LOWER(email) = LOWER(?) LIMIT 1`,
      [email],
    )
    if (existing.length > 0) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 })
    }

    const idCardNumber = typeof body.idCardNumber === "string" ? body.idCardNumber.trim() : ""
    if (idCardNumber) {
      const idCardExists = await dbQuery<any>(
        `SELECT id FROM ${studentsTable} WHERE LOWER(idCardNumber) = LOWER(?) LIMIT 1`,
        [idCardNumber],
      )
      if (idCardExists.length > 0) {
        return NextResponse.json({ error: "ID card number already exists" }, { status: 409 })
      }
    }

    const id = randomUUID()
    const password = typeof body.password === "string" ? body.password : ""
    const passwordHash = password ? await bcrypt.hash(password, 10) : null

    const photo = typeof body.photo === "string" ? body.photo : ""
    const birthday = typeof body.birthday === "string" ? body.birthday : ""

    await dbQuery(
      `INSERT INTO ${studentsTable} (
        id,
        firstName, lastName, email, passwordHash, birthday,
        phone, className, sectionName, gender,
        bloodType, nationality, religion,
        address, address2, city, zip,
        idCardNumber, boardRegistrationNo,
        fatherName, motherName, fatherPhone, motherPhone,
        fatherOccupation, motherOccupation, fatherEmail, motherEmail,
        emergencyContact, medicalConditions, allergies, previousSchool, transferReason,
        studentId, status, enrollmentDate, photo
      ) VALUES (
        ?,
        ?, ?, ?, ?, NULLIF(?, ''),
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, NULLIF(?, ''), ?, ?,
        NULLIF(?, ''), NULLIF(?, ''),
        ?, ?, ?, ?,
        NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''),
        ?, NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''),
        ?, 'active', CURRENT_DATE(), NULLIF(?, '')
      )`,
      [
        id,
        String(body.firstName).trim(),
        String(body.lastName).trim(),
        email,
        passwordHash,
        birthday,
        String(body.phone).trim(),
        String(body.class).trim(),
        String(body.section).trim(),
        String(body.gender).trim(),
        String(body.bloodType).trim(),
        String(body.nationality).trim(),
        String(body.religion).trim(),
        String(body.address).trim(),
        typeof body.address2 === "string" ? body.address2.trim() : "",
        String(body.city).trim(),
        String(body.zip).trim(),
        idCardNumber,
        typeof body.boardRegistrationNo === "string" ? body.boardRegistrationNo.trim() : "",
        String(body.fatherName).trim(),
        String(body.motherName).trim(),
        String(body.fatherPhone).trim(),
        String(body.motherPhone).trim(),
        typeof body.fatherOccupation === "string" ? body.fatherOccupation.trim() : "",
        typeof body.motherOccupation === "string" ? body.motherOccupation.trim() : "",
        typeof body.fatherEmail === "string" ? body.fatherEmail.trim() : "",
        typeof body.motherEmail === "string" ? body.motherEmail.trim() : "",
        String(body.emergencyContact).trim(),
        typeof body.medicalConditions === "string" ? body.medicalConditions.trim() : "",
        typeof body.allergies === "string" ? body.allergies.trim() : "",
        typeof body.previousSchool === "string" ? body.previousSchool.trim() : "",
        typeof body.transferReason === "string" ? body.transferReason.trim() : "",
        `tmp-${id}`,
        photo || "/diverse-student-portraits.png",
      ],
    )

    const seqRows = await dbQuery<any>(`SELECT sequence, className, sectionName FROM ${studentsTable} WHERE id = ? LIMIT 1`, [id])
    const sequence = Number(seqRows?.[0]?.sequence || 0)
    const className = String(seqRows?.[0]?.className || body.class)
    const sectionName = String(seqRows?.[0]?.sectionName || body.section)
    const studentId = generateStudentIdFromSequence(className, sectionName, sequence)

    await dbQuery(`UPDATE ${studentsTable} SET studentId = ? WHERE id = ?`, [studentId, id])

    const createdRows = await dbQuery<any>(
      `SELECT 
        id, firstName, lastName, email, phone, className, sectionName, photo, status, gender,
        enrollmentDate, studentId, bloodType, nationality, religion, address, address2, city, zip,
        fatherName, motherName, fatherPhone, motherPhone, fatherOccupation, motherOccupation,
        fatherEmail, motherEmail, emergencyContact, medicalConditions, allergies, previousSchool,
        transferReason, birthday, idCardNumber, boardRegistrationNo, program, faculty, department, createdAt, updatedAt
      FROM ${studentsTable} WHERE id = ? LIMIT 1`,
      [id],
    )

    const newStudent = createdRows[0] ? toStudentDto(createdRows[0] as DbStudentRow) : null

    return NextResponse.json({ message: "Student created successfully", student: newStudent }, { status: 201 })
  } catch (error) {
    console.error("Error creating student:", error)
    const errObj = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null
    const code = errObj && typeof errObj.code === "string" ? errObj.code : ""
    const message = errObj && typeof errObj.message === "string" ? errObj.message : ""
    if (code === "ER_DUP_ENTRY" && /uniq_idCardNumber|idCardNumber/i.test(message)) {
      return NextResponse.json({ error: "ID card number already exists" }, { status: 409 })
    }
    const details = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to create student", details: process.env.NODE_ENV === "development" ? details : undefined },
      { status: 500 },
    )
  }
}
