import { type NextRequest, NextResponse } from "next/server"
import { dbQuery } from "@/lib/db"

type DbTeacherRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  gender: "Male" | "Female" | string
  nationality: string
  address: string
  address2: string | null
  city: string
  zip: string
  photo: string | null
  subjects: string | null
  qualifications: string | null
  experience: string | null
  joiningDate: string | null
  salary: number | null
  status: "Active" | "Inactive" | string
  createdAt: string
  updatedAt: string
}

async function ensureTeachersTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_teachers (
      id VARCHAR(36) PRIMARY KEY,
      firstName VARCHAR(100) NOT NULL,
      lastName VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      gender VARCHAR(20) NOT NULL,
      nationality VARCHAR(100) NOT NULL,
      address VARCHAR(255) NOT NULL,
      address2 VARCHAR(255) NULL,
      city VARCHAR(100) NOT NULL,
      zip VARCHAR(20) NOT NULL,
      photo MEDIUMTEXT NULL,
      subjects TEXT NULL,
      qualifications TEXT NULL,
      experience VARCHAR(50) NULL,
      joiningDate DATE NULL,
      salary DECIMAL(12,2) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_email (email),
      INDEX idx_status (status),
      INDEX idx_name (lastName, firstName)
    ) ENGINE=InnoDB`,
    []
  )

  // If the table already existed with an older schema, make sure `photo` can store base64 data URLs.
  const photoTypeRows = await dbQuery<any>(
    "SELECT DATA_TYPE as dataType FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'academic_module_teachers' AND COLUMN_NAME = 'photo' LIMIT 1",
    []
  )

  const dataType = String(photoTypeRows?.[0]?.dataType || "").toLowerCase()
  if (dataType && dataType !== "mediumtext") {
    await dbQuery("ALTER TABLE academic_module_teachers MODIFY COLUMN photo MEDIUMTEXT NULL", [])
  }
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : []
  } catch {
    return []
  }
}

function toTeacherDto(row: DbTeacherRow) {
  return {
    id: String(row.id),
    firstName: String(row.firstName),
    lastName: String(row.lastName),
    email: String(row.email),
    phone: String(row.phone),
    gender: row.gender === "Male" || row.gender === "Female" ? row.gender : (row.gender as any),
    nationality: String(row.nationality),
    address: String(row.address),
    address2: row.address2 ? String(row.address2) : "",
    city: String(row.city),
    zip: String(row.zip),
    photo: row.photo ? String(row.photo) : "",
    subjects: parseJsonArray(row.subjects),
    qualifications: parseJsonArray(row.qualifications),
    experience: row.experience ? String(row.experience) : "",
    joiningDate: row.joiningDate ? String(row.joiningDate) : "",
    salary: row.salary !== null && row.salary !== undefined ? Number(row.salary) : 0,
    status: row.status === "Active" || row.status === "Inactive" ? row.status : (row.status as any),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureTeachersTable()

    const { searchParams } = new URL(request.url)
    const pageRaw = Number.parseInt(searchParams.get("page") || "1")
    const limitRaw = Number.parseInt(searchParams.get("limit") || "10")
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 10
    const search = searchParams.get("search") || ""
    const gender = searchParams.get("gender") || ""
    const status = searchParams.get("status") || ""
    const subject = searchParams.get("subject") || ""

    const where: string[] = []
    const params: unknown[] = []

    if (search) {
      const like = `%${search}%`
      where.push("(firstName LIKE ? OR lastName LIKE ? OR email LIKE ? OR phone LIKE ? OR subjects LIKE ?)")
      params.push(like, like, like, like, like)
    }

    if (gender) {
      where.push("gender = ?")
      params.push(gender)
    }

    if (status) {
      where.push("status = ?")
      params.push(status)
    }

    if (subject) {
      where.push("subjects LIKE ?")
      params.push(`%${subject}%`)
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const countRows = await dbQuery<any>(`SELECT COUNT(*) as total FROM academic_module_teachers ${whereSql}`, params)
    const totalItems = Number(countRows?.[0]?.total || 0)
    const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, limit)))
    const safePage = Math.min(Math.max(1, page), totalPages)
    const offset = (safePage - 1) * limit

    const rows = await dbQuery<any>(
      `SELECT id, firstName, lastName, email, phone, gender, nationality, address, address2, city, zip, photo, subjects, qualifications, experience, joiningDate, salary, status, createdAt, updatedAt
       FROM academic_module_teachers
       ${whereSql}
       ORDER BY createdAt DESC
       LIMIT ${offset}, ${limit}`,
      params
    )

    const paginatedTeachers = (rows || []).map((r: any) => toTeacherDto(r as DbTeacherRow))

    return NextResponse.json({
      teachers: paginatedTeachers,
      pagination: {
        currentPage: safePage,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1,
      },
      filters: {
        search,
        gender,
        status,
        subject,
      },
    })
  } catch (error) {
    console.error("Error fetching teachers:", error)
    return NextResponse.json({ error: "Failed to fetch teachers" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTeachersTable()

    const body = await request.json()

    // Validate required fields
    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "gender",
      "nationality",
      "address",
      "city",
      "zip",
    ]
    const missingFields = requiredFields.filter((field) => !body[field])

    if (missingFields.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missingFields.join(", ")}` }, { status: 400 })
    }

    // Check if email already exists
    const email = String(body.email).trim()
    const existing = await dbQuery<any>(
      "SELECT id FROM academic_module_teachers WHERE LOWER(email) = LOWER(?) LIMIT 1",
      [email]
    )
    if (existing.length > 0) {
      return NextResponse.json({ error: "A teacher with this email already exists" }, { status: 409 })
    }

    const firstName = String(body.firstName).trim()
    const lastName = String(body.lastName).trim()
    const phone = String(body.phone).trim()
    const gender = String(body.gender).trim()
    const nationality = String(body.nationality).trim()
    const address = String(body.address).trim()
    const address2 = typeof body.address2 === "string" ? body.address2.trim() : ""
    const city = String(body.city).trim()
    const zip = String(body.zip).trim()
    const photo = typeof body.photo === "string" ? body.photo.trim() : ""
    const subjects = Array.isArray(body.subjects) ? body.subjects.map((s: any) => String(s)) : []
    const qualifications = Array.isArray(body.qualifications)
      ? body.qualifications.map((q: any) => String(q))
      : []
    const experience = typeof body.experience === "string" ? body.experience.trim() : ""
    const joiningDate = typeof body.joiningDate === "string" ? body.joiningDate.trim() : ""
    const salary = body.salary !== undefined && body.salary !== null ? Number(body.salary) : 0

    await dbQuery(
      `INSERT INTO academic_module_teachers (
        id, firstName, lastName, email, phone, gender, nationality, address, address2, city, zip, photo,
        subjects, qualifications, experience, joiningDate, salary, status
      ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [
        firstName,
        lastName,
        email,
        phone,
        gender,
        nationality,
        address,
        address2 || null,
        city,
        zip,
        photo || null,
        JSON.stringify(subjects),
        JSON.stringify(qualifications),
        experience || null,
        joiningDate || null,
        Number.isFinite(salary) ? salary : 0,
      ]
    )

    const created = await dbQuery<any>(
      "SELECT id, firstName, lastName, email, phone, gender, nationality, address, address2, city, zip, photo, subjects, qualifications, experience, joiningDate, salary, status, createdAt, updatedAt FROM academic_module_teachers WHERE LOWER(email) = LOWER(?) ORDER BY createdAt DESC LIMIT 1",
      [email]
    )

    const newTeacher = created[0] ? toTeacherDto(created[0] as DbTeacherRow) : null

    return NextResponse.json(
      {
        message: "Teacher created successfully",
        teacher: newTeacher,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating teacher:", error)
    const details = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        error: "Failed to create teacher",
        details: process.env.NODE_ENV === "development" ? details : undefined,
      },
      { status: 500 }
    )
  }
}
