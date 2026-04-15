import { type NextRequest, NextResponse } from "next/server"
import { dbQuery } from "@/lib/db"
import type { Syllabus } from "@/types/syllabus"
import crypto from "crypto"

type DbSyllabusRow = {
  id: string
  name: string
  faculty: string | null
  classId: string
  courseId: string
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
  uploadedBy: string
  uploadedAt: string
  updatedAt: string
  className?: string | null
  courseName?: string | null
}

async function ensureClassesTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_classes (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT NULL,
      academicYear VARCHAR(20) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_academicYear (academicYear),
      INDEX idx_name (name)
    ) ENGINE=InnoDB`,
    []
  )
}

async function ensureCoursesTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_courses (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_type (type),
      INDEX idx_name (name)
    ) ENGINE=InnoDB`,
    []
  )
}

async function ensureSyllabiTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_syllabi (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      faculty VARCHAR(255) NOT NULL DEFAULT '',
      classId VARCHAR(36) NOT NULL,
      courseId VARCHAR(36) NOT NULL,
      fileName VARCHAR(255) NOT NULL,
      fileUrl TEXT NOT NULL,
      fileSize BIGINT NOT NULL,
      fileType VARCHAR(150) NOT NULL,
      fileData LONGBLOB NULL,
      uploadedBy VARCHAR(255) NOT NULL,
      uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_classId (classId),
      INDEX idx_courseId (courseId),
      INDEX idx_uploadedAt (uploadedAt),
      INDEX idx_name (name)
    ) ENGINE=InnoDB`,
    []
  )

  try {
    await dbQuery(
      "ALTER TABLE academic_module_syllabi ADD COLUMN fileData LONGBLOB NULL",
      []
    )
  } catch {
    // ignore if column already exists
  }

  try {
    await dbQuery(
      "ALTER TABLE academic_module_syllabi ADD COLUMN faculty VARCHAR(255) NOT NULL DEFAULT ''",
      []
    )
  } catch {
    // ignore if column already exists
  }
}

function toSyllabusDto(row: DbSyllabusRow): Syllabus {
  return {
    id: String(row.id),
    name: String(row.name),
    faculty: row.faculty ? String(row.faculty) : "",
    classId: String(row.classId),
    className: row.className ? String(row.className) : "",
    courseId: String(row.courseId),
    courseName: row.courseName ? String(row.courseName) : "",
    fileName: String(row.fileName),
    fileUrl: String(row.fileUrl),
    fileSize: Number(row.fileSize),
    fileType: String(row.fileType),
    uploadedBy: String(row.uploadedBy),
    uploadedAt: new Date(row.uploadedAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureClassesTable()
    await ensureCoursesTable()
    await ensureSyllabiTable()

    const { searchParams } = new URL(request.url)
    const faculty = searchParams.get("faculty")
    const classId = searchParams.get("classId")
    const courseId = searchParams.get("courseId")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    const safePage = Number.isFinite(page) && page > 0 ? page : 1
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 10
    const offset = (safePage - 1) * safeLimit

    const whereClauses: string[] = []
    const whereParams: any[] = []

    if (classId) {
      whereClauses.push("s.classId = ?")
      whereParams.push(classId)
    }

    if (courseId) {
      whereClauses.push("s.courseId = ?")
      whereParams.push(courseId)
    }

    if (faculty) {
      whereClauses.push("s.faculty LIKE ?")
      whereParams.push(`%${faculty}%`)
    }

    if (search) {
      const like = `%${search}%`
      whereClauses.push("(s.name LIKE ? OR s.fileName LIKE ? OR c.name LIKE ? OR crs.name LIKE ?)")
      whereParams.push(like, like, like, like)
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : ""

    const countRows = await dbQuery<any>(
      `SELECT COUNT(*) as total
       FROM academic_module_syllabi s
       LEFT JOIN academic_module_classes c ON c.id = s.classId
       LEFT JOIN academic_module_courses crs ON crs.id = s.courseId
       ${whereSql}`,
      whereParams
    )
    const total = Number(countRows?.[0]?.total ?? 0)

    const rows = await dbQuery<any>(
      `SELECT
         s.id, s.name, s.faculty, s.classId, c.name as className,
         s.courseId, crs.name as courseName,
         s.fileName, s.fileUrl, s.fileSize, s.fileType,
         s.uploadedBy, s.uploadedAt, s.updatedAt
       FROM academic_module_syllabi s
       LEFT JOIN academic_module_classes c ON c.id = s.classId
       LEFT JOIN academic_module_courses crs ON crs.id = s.courseId
       ${whereSql}
       ORDER BY s.uploadedAt DESC
       LIMIT ${safeLimit} OFFSET ${offset}`,
      whereParams
    )

    const syllabi = ((rows || []) as DbSyllabusRow[]).map(toSyllabusDto)

    return NextResponse.json({
      syllabi,
      total,
      page: safePage,
      limit: safeLimit,
    })
  } catch (error) {
    console.error("Error fetching syllabi:", error)
    return NextResponse.json(
      { error: "Failed to fetch syllabi" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureClassesTable()
    await ensureCoursesTable()
    await ensureSyllabiTable()

    const formData = await request.formData()
    const name = formData.get("name") as string
    const faculty = formData.get("faculty") as string
    const classId = formData.get("classId") as string
    const courseId = formData.get("courseId") as string
    const file = formData.get("file") as File

    if (!name || !faculty || !classId || !courseId || !file) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF, Word documents, and text files are allowed." },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 10MB." },
        { status: 400 }
      )
    }

    const classRows = await dbQuery<any>("SELECT id, name FROM academic_module_classes WHERE id = ? LIMIT 1", [
      classId,
    ])
    const courseRows = await dbQuery<any>("SELECT id, name FROM academic_module_courses WHERE id = ? LIMIT 1", [
      courseId,
    ])

    if (!classRows?.[0] || !courseRows?.[0]) {
      return NextResponse.json({ error: "Invalid class or course selection" }, { status: 400 })
    }

    const fileUrl = `/uploads/syllabi/${Date.now()}-${file.name}`

    const syllabusId = crypto.randomUUID()
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const downloadUrl = `/api/syllabus/${syllabusId}/download`

    await dbQuery(
      "INSERT INTO academic_module_syllabi (id, name, faculty, classId, courseId, fileName, fileUrl, fileSize, fileType, fileData, uploadedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [syllabusId, name, faculty, classId, courseId, file.name, downloadUrl, file.size, file.type, fileBuffer, "Current User"]
    )

    const created = await dbQuery<any>(
      `SELECT
         s.id, s.name, s.faculty, s.classId, c.name as className,
         s.courseId, crs.name as courseName,
         s.fileName, s.fileUrl, s.fileSize, s.fileType,
         s.uploadedBy, s.uploadedAt, s.updatedAt
       FROM academic_module_syllabi s
       LEFT JOIN academic_module_classes c ON c.id = s.classId
       LEFT JOIN academic_module_courses crs ON crs.id = s.courseId
       WHERE s.id = ?
       LIMIT 1`,
      [syllabusId]
    )

    const syllabus = created?.[0] ? toSyllabusDto(created[0] as DbSyllabusRow) : null

    return NextResponse.json({ message: "Syllabus created successfully", syllabus })
  } catch (error) {
    console.error("Error creating syllabus:", error)
    return NextResponse.json(
      { error: "Failed to create syllabus" },
      { status: 500 }
    )
  }
}