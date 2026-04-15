import { NextRequest, NextResponse } from "next/server"
import { dbQuery } from "@/lib/db"

type AttendanceType = "section" | "course"

async function ensureSettingsTable(): Promise<void> {
  await dbQuery(
    `CREATE TABLE IF NOT EXISTS academic_module_settings (
      settingKey VARCHAR(100) PRIMARY KEY,
      settingValue VARCHAR(255) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,
    []
  )
}

export async function GET() {
  try {
    await ensureSettingsTable()

    const rows = await dbQuery<any>(
      "SELECT settingValue FROM academic_module_settings WHERE settingKey = 'attendanceType' LIMIT 1",
      []
    )

    const value = rows?.[0]?.settingValue
    const attendanceType = value === "section" || value === "course" ? (value as AttendanceType) : null

    return NextResponse.json({ success: true, data: { attendanceType } })
  } catch (error) {
    console.error("[GET /api/attendance-type]", error)
    const message = error instanceof Error ? error.message : "Failed to fetch attendance type"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSettingsTable()

    const body = await request.json().catch(() => null)
    const attendanceType = typeof body?.attendanceType === "string" ? body.attendanceType.trim() : ""

    if (attendanceType !== "section" && attendanceType !== "course") {
      return NextResponse.json(
        { success: false, message: "attendanceType must be 'section' or 'course'" },
        { status: 400 }
      )
    }

    await dbQuery(
      "INSERT INTO academic_module_settings (settingKey, settingValue) VALUES ('attendanceType', ?) ON DUPLICATE KEY UPDATE settingValue = VALUES(settingValue)",
      [attendanceType]
    )

    return NextResponse.json({
      success: true,
      message: "Attendance type saved successfully",
      data: { attendanceType },
    })
  } catch (error) {
    console.error("[POST /api/attendance-type]", error)
    const message = error instanceof Error ? error.message : "Failed to save attendance type"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
