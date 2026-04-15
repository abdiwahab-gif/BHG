import { type NextRequest, NextResponse } from "next/server"
import { dbQuery } from "@/lib/db"
import { type DbStudentRow, ensureStudentsTable, resolveStudentsPhysicalTableName, toStudentDto } from "../_db"

function selectForIdsBase(tableName: string) {
  return `SELECT 
  id, firstName, lastName, email, phone, className, sectionName, photo, status, gender,
  enrollmentDate, studentId, bloodType, nationality, religion, address, address2, city, zip,
  fatherName, motherName, fatherPhone, motherPhone, fatherOccupation, motherOccupation,
  fatherEmail, motherEmail, emergencyContact, medicalConditions, allergies, previousSchool,
  transferReason, birthday, idCardNumber, boardRegistrationNo, createdAt, updatedAt
FROM ${tableName}`
}

// DELETE /api/students/bulk - Delete multiple students
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Student IDs are required" }, { status: 400 })
    }

    await ensureStudentsTable()

    const studentsTable = await resolveStudentsPhysicalTableName()

    const cleanIds = ids.map((v: any) => String(v)).filter(Boolean)
    const placeholders = cleanIds.map(() => "?").join(",")

    const existingRows = await dbQuery<any>(
      `${selectForIdsBase(studentsTable)} WHERE id IN (${placeholders})`,
      cleanIds,
    )

    const existingIds = new Set((existingRows || []).map((r: any) => String(r.id)))
    const notFoundIds = cleanIds.filter((id: string) => !existingIds.has(id))

    if (cleanIds.length > 0) {
      await dbQuery(`DELETE FROM ${studentsTable} WHERE id IN (${placeholders})`, cleanIds)
    }

    const deletedStudents = (existingRows || []).map((r: any) => toStudentDto(r as DbStudentRow))

    return NextResponse.json({
      message: `${deletedStudents.length} students deleted successfully`,
      deletedStudents,
      notFoundIds,
      deletedCount: deletedStudents.length,
    })
  } catch (error) {
    console.error("Error deleting students:", error)
    return NextResponse.json({ error: "Failed to delete students" }, { status: 500 })
  }
}

// PATCH /api/students/bulk - Update multiple students (e.g., status changes)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, updates } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Student IDs are required" }, { status: 400 })
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Updates object is required" }, { status: 400 })
    }

    await ensureStudentsTable()

    const studentsTable = await resolveStudentsPhysicalTableName()

    const cleanIds = ids.map((v: any) => String(v)).filter(Boolean)
    const placeholders = cleanIds.map(() => "?").join(",")

    const allowedMap: Record<string, string> = {
      status: "status",
      class: "className",
      section: "sectionName",
      gender: "gender",
    }

    const setParts: string[] = []
    const updateParams: unknown[] = []

    for (const [key, column] of Object.entries(allowedMap)) {
      if (updates[key] === undefined) continue
      setParts.push(`${column} = ?`)
      updateParams.push(typeof updates[key] === "string" ? updates[key].trim() : updates[key])
    }

    if (setParts.length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    // Grab current rows so we can report notFoundIds.
    const existingRows = await dbQuery<any>(
      `SELECT id FROM ${studentsTable} WHERE id IN (${placeholders})`,
      cleanIds,
    )
    const existingIds = new Set((existingRows || []).map((r: any) => String(r.id)))
    const notFoundIds = cleanIds.filter((id: string) => !existingIds.has(id))

    await dbQuery(
      `UPDATE ${studentsTable} SET ${setParts.join(", ")} WHERE id IN (${placeholders})`,
      [...updateParams, ...cleanIds],
    )

    const updatedRows = await dbQuery<any>(
      `${selectForIdsBase(studentsTable)} WHERE id IN (${placeholders})`,
      cleanIds,
    )

    const updatedStudents = (updatedRows || []).map((r: any) => toStudentDto(r as DbStudentRow))

    return NextResponse.json({
      message: `${updatedStudents.length} students updated successfully`,
      updatedStudents,
      notFoundIds,
      updatedCount: updatedStudents.length,
    })
  } catch (error) {
    console.error("Error updating students:", error)
    return NextResponse.json({ error: "Failed to update students" }, { status: 500 })
  }
}
