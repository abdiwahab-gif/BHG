import { type NextRequest, NextResponse } from "next/server"
import { dbQuery } from "@/lib/db"

type DbTeacherRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  gender: string
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
  status: string
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
    gender: String(row.gender),
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
    status: String(row.status),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureTeachersTable()

    const rows = await dbQuery<any>(
      "SELECT id, firstName, lastName, email, phone, gender, nationality, address, address2, city, zip, photo, subjects, qualifications, experience, joiningDate, salary, status, createdAt, updatedAt FROM academic_module_teachers WHERE id = ? LIMIT 1",
      [params.id]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    return NextResponse.json({ teacher: toTeacherDto(rows[0] as DbTeacherRow) })
  } catch (error) {
    console.error("Error fetching teacher:", error)
    return NextResponse.json({ error: "Failed to fetch teacher" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureTeachersTable()

    const body = await request.json().catch(() => null)
    const existingRows = await dbQuery<any>(
      "SELECT id, firstName, lastName, email, phone, gender, nationality, address, address2, city, zip, photo, subjects, qualifications, experience, joiningDate, salary, status, createdAt, updatedAt FROM academic_module_teachers WHERE id = ? LIMIT 1",
      [params.id]
    )

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    const existing = existingRows[0] as DbTeacherRow

    // Check if email is being changed and if it conflicts with another teacher
    const nextEmail = typeof body?.email === "string" ? body.email.trim() : undefined
    if (nextEmail && nextEmail.toLowerCase() !== String(existing.email).toLowerCase()) {
      const emailConflict = await dbQuery<any>(
        "SELECT id FROM academic_module_teachers WHERE LOWER(email) = LOWER(?) AND id <> ? LIMIT 1",
        [nextEmail, params.id]
      )
      if (emailConflict.length > 0) {
        return NextResponse.json({ error: "A teacher with this email already exists" }, { status: 409 })
      }
    }

    const nextFirstName = typeof body?.firstName === "string" ? body.firstName.trim() : String(existing.firstName)
    const nextLastName = typeof body?.lastName === "string" ? body.lastName.trim() : String(existing.lastName)
    const nextPhone = typeof body?.phone === "string" ? body.phone.trim() : String(existing.phone)
    const nextGender = typeof body?.gender === "string" ? body.gender.trim() : String(existing.gender)
    const nextNationality = typeof body?.nationality === "string" ? body.nationality.trim() : String(existing.nationality)
    const nextAddress = typeof body?.address === "string" ? body.address.trim() : String(existing.address)
    const nextAddress2 = typeof body?.address2 === "string" ? body.address2.trim() : String(existing.address2 ?? "")
    const nextCity = typeof body?.city === "string" ? body.city.trim() : String(existing.city)
    const nextZip = typeof body?.zip === "string" ? body.zip.trim() : String(existing.zip)
    const nextPhoto = typeof body?.photo === "string" ? body.photo.trim() : String(existing.photo ?? "")
    const nextSubjects = Array.isArray(body?.subjects) ? JSON.stringify(body.subjects.map((s: any) => String(s))) : existing.subjects
    const nextQualifications = Array.isArray(body?.qualifications)
      ? JSON.stringify(body.qualifications.map((q: any) => String(q)))
      : existing.qualifications
    const nextExperience = typeof body?.experience === "string" ? body.experience.trim() : String(existing.experience ?? "")
    const nextJoiningDate = typeof body?.joiningDate === "string" ? body.joiningDate.trim() : String(existing.joiningDate ?? "")
    const nextSalary = body?.salary !== undefined && body?.salary !== null ? Number(body.salary) : existing.salary
    const nextStatus = typeof body?.status === "string" ? body.status.trim() : String(existing.status)

    await dbQuery(
      `UPDATE academic_module_teachers SET
        firstName = ?,
        lastName = ?,
        email = ?,
        phone = ?,
        gender = ?,
        nationality = ?,
        address = ?,
        address2 = ?,
        city = ?,
        zip = ?,
        photo = ?,
        subjects = ?,
        qualifications = ?,
        experience = ?,
        joiningDate = ?,
        salary = ?,
        status = ?
      WHERE id = ?`,
      [
        nextFirstName,
        nextLastName,
        nextEmail ?? String(existing.email),
        nextPhone,
        nextGender,
        nextNationality,
        nextAddress,
        nextAddress2 || null,
        nextCity,
        nextZip,
        nextPhoto || null,
        nextSubjects,
        nextQualifications,
        nextExperience || null,
        nextJoiningDate || null,
        nextSalary ?? 0,
        nextStatus,
        params.id,
      ]
    )

    const updatedRows = await dbQuery<any>(
      "SELECT id, firstName, lastName, email, phone, gender, nationality, address, address2, city, zip, photo, subjects, qualifications, experience, joiningDate, salary, status, createdAt, updatedAt FROM academic_module_teachers WHERE id = ? LIMIT 1",
      [params.id]
    )

    const updatedTeacher = updatedRows[0] ? toTeacherDto(updatedRows[0] as DbTeacherRow) : null

    return NextResponse.json({
      message: "Teacher updated successfully",
      teacher: updatedTeacher,
    })
  } catch (error) {
    console.error("Error updating teacher:", error)
    return NextResponse.json({ error: "Failed to update teacher" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureTeachersTable()

    const rows = await dbQuery<any>(
      "SELECT id, firstName, lastName, email, phone, gender, nationality, address, address2, city, zip, photo, subjects, qualifications, experience, joiningDate, salary, status, createdAt, updatedAt FROM academic_module_teachers WHERE id = ? LIMIT 1",
      [params.id]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    await dbQuery("DELETE FROM academic_module_teachers WHERE id = ?", [params.id])

    const deletedTeacher = toTeacherDto(rows[0] as DbTeacherRow)

    return NextResponse.json({
      message: "Teacher deleted successfully",
      teacher: deletedTeacher,
    })
  } catch (error) {
    console.error("Error deleting teacher:", error)
    return NextResponse.json({ error: "Failed to delete teacher" }, { status: 500 })
  }
}
