import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { dbQuery } from "@/lib/db"
import { type DbStudentRow, ensureStudentsTable, resolveStudentsPhysicalTableName, toStudentDto } from "../_db"

function selectStudentSql(tableName: string) {
  return `SELECT 
  id, firstName, lastName, email, phone, className, sectionName, photo, status, gender,
  enrollmentDate, studentId, bloodType, nationality, religion, address, address2, city, zip,
  fatherName, motherName, fatherPhone, motherPhone, fatherOccupation, motherOccupation,
  fatherEmail, motherEmail, emergencyContact, medicalConditions, allergies, previousSchool,
  transferReason, birthday, idCardNumber, boardRegistrationNo, createdAt, updatedAt
FROM ${tableName} WHERE id = ? LIMIT 1`
}

// GET /api/students/[id] - Get a specific student
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    await ensureStudentsTable()

    const studentsTable = await resolveStudentsPhysicalTableName()

    const rows = await dbQuery<any>(selectStudentSql(studentsTable), [id])
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    return NextResponse.json({ student: toStudentDto(rows[0] as DbStudentRow) })
  } catch (error) {
    console.error("Error fetching student:", error)
    return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 })
  }
}

// PUT /api/students/[id] - Update a specific student
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()

    await ensureStudentsTable()

    const studentsTable = await resolveStudentsPhysicalTableName()

    const exists = await dbQuery<any>(`SELECT id FROM ${studentsTable} WHERE id = ? LIMIT 1`, [id])
    if (!exists || exists.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    if (body.email) {
      const email = String(body.email).trim()
      const emailExists = await dbQuery<any>(
        `SELECT id FROM ${studentsTable} WHERE LOWER(email) = LOWER(?) AND id <> ? LIMIT 1`,
        [email, id],
      )
      if (emailExists.length > 0) {
        return NextResponse.json({ error: "Email already exists" }, { status: 409 })
      }
    }

    if (body.idCardNumber !== undefined) {
      const idCardNumber = typeof body.idCardNumber === "string" ? body.idCardNumber.trim() : ""
      if (idCardNumber) {
        const idCardExists = await dbQuery<any>(
          `SELECT id FROM ${studentsTable} WHERE LOWER(idCardNumber) = LOWER(?) AND id <> ? LIMIT 1`,
          [idCardNumber, id],
        )
        if (idCardExists.length > 0) {
          return NextResponse.json({ error: "ID card number already exists" }, { status: 409 })
        }
      }
    }

    const allowedMap: Record<string, string> = {
      firstName: "firstName",
      lastName: "lastName",
      email: "email",
      phone: "phone",
      class: "className",
      section: "sectionName",
      gender: "gender",
      bloodType: "bloodType",
      nationality: "nationality",
      religion: "religion",
      address: "address",
      address2: "address2",
      city: "city",
      zip: "zip",
      photo: "photo",
      status: "status",
      fatherName: "fatherName",
      motherName: "motherName",
      fatherPhone: "fatherPhone",
      motherPhone: "motherPhone",
      fatherOccupation: "fatherOccupation",
      motherOccupation: "motherOccupation",
      fatherEmail: "fatherEmail",
      motherEmail: "motherEmail",
      emergencyContact: "emergencyContact",
      medicalConditions: "medicalConditions",
      allergies: "allergies",
      previousSchool: "previousSchool",
      transferReason: "transferReason",
      birthday: "birthday",
      idCardNumber: "idCardNumber",
      boardRegistrationNo: "boardRegistrationNo",
    }

    const setParts: string[] = []
    const paramsArr: unknown[] = []

    for (const [key, column] of Object.entries(allowedMap)) {
      if (body[key] === undefined) continue

      const rawValue = typeof body[key] === "string" ? body[key].trim() : body[key]
      if (column === "idCardNumber" || column === "boardRegistrationNo") {
        setParts.push(`${column} = NULLIF(?, '')`)
        paramsArr.push(typeof rawValue === "string" ? rawValue : String(rawValue ?? ""))
      } else {
        setParts.push(`${column} = ?`)
        paramsArr.push(rawValue)
      }
    }

    if (typeof body.password === "string" && body.password.trim()) {
      const passwordHash = await bcrypt.hash(body.password.trim(), 10)
      setParts.push("passwordHash = ?")
      paramsArr.push(passwordHash)
    }

    if (setParts.length === 0) {
      const current = await dbQuery<any>(selectStudentSql(studentsTable), [id])
      return NextResponse.json({ message: "Student updated successfully", student: toStudentDto(current[0] as DbStudentRow) })
    }

    paramsArr.push(id)
    await dbQuery(`UPDATE ${studentsTable} SET ${setParts.join(", ")} WHERE id = ?`, paramsArr)

    const updatedRows = await dbQuery<any>(selectStudentSql(studentsTable), [id])
    return NextResponse.json({
      message: "Student updated successfully",
      student: toStudentDto(updatedRows[0] as DbStudentRow),
    })
  } catch (error) {
    console.error("Error updating student:", error)
    const errObj = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null
    const code = errObj && typeof errObj.code === "string" ? errObj.code : ""
    const message = errObj && typeof errObj.message === "string" ? errObj.message : ""
    if (code === "ER_DUP_ENTRY" && /uniq_idCardNumber|idCardNumber/i.test(message)) {
      return NextResponse.json({ error: "ID card number already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 })
  }
}

// DELETE /api/students/[id] - Delete a specific student
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    await ensureStudentsTable()

    const studentsTable = await resolveStudentsPhysicalTableName()

    const rows = await dbQuery<any>(selectStudentSql(studentsTable), [id])
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    await dbQuery(`DELETE FROM ${studentsTable} WHERE id = ?`, [id])

    return NextResponse.json({
      message: "Student deleted successfully",
      student: toStudentDto(rows[0] as DbStudentRow),
    })
  } catch (error) {
    console.error("Error deleting student:", error)
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 })
  }
}
