import { NextResponse, type NextRequest } from "next/server"
import { dbQuery } from "@/lib/db"

type DbSyllabusFileRow = {
  id: string
  fileName: string
  fileType: string
  fileData: Buffer | Uint8Array | null
}

async function ensureSyllabiTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_syllabi (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
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
}

function sanitizeFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, "_")
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSyllabiTable()

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Missing syllabus id" }, { status: 400 })
    }

    const rows = await dbQuery<DbSyllabusFileRow>(
      "SELECT id, fileName, fileType, fileData FROM academic_module_syllabi WHERE id = ? LIMIT 1",
      [id]
    )

    const row = rows?.[0]
    if (!row) {
      return NextResponse.json({ error: "Syllabus not found" }, { status: 404 })
    }

    if (!row.fileData) {
      return NextResponse.json(
        { error: "No file data stored for this syllabus" },
        { status: 404 }
      )
    }

    const filename = sanitizeFilename(row.fileName || "syllabus")
    const fileType = row.fileType || "application/octet-stream"

    return new NextResponse(row.fileData as any, {
      status: 200,
      headers: {
        "Content-Type": fileType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Error downloading syllabus file:", error)
    return NextResponse.json(
      { error: "Failed to download syllabus file" },
      { status: 500 }
    )
  }
}
