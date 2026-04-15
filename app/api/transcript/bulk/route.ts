import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { RowDataPacket } from "mysql2/promise"
import QRCode from "qrcode"

import { dbQuery } from "@/lib/db"
import { ensureCoursesTable } from "@/app/api/courses/_db"
import { ensureStudentsTable } from "@/app/api/students/_db"
import { buildTranscriptDataWithOptions } from "@/lib/transcript"
import type { TranscriptData, TranscriptSecurity } from "@/types/transcript"

function toBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === "") return defaultValue
  return value === "true" || value === "1"
}

const querySchema = z.object({
  department: z.string().min(1),
  publishedOnly: z.string().optional(),
  includeSecurity: z.string().optional(),
  limit: z.string().optional(),
})

type CandidateRow = RowDataPacket & {
  id: string
  studentId: string
}

type BulkTranscriptResponse =
  | { success: true; department: string; count: number; transcripts: TranscriptData[] }
  | { success: false; error: string; details?: unknown }

export async function GET(request: NextRequest) {
  try {
    await ensureCoursesTable()
    await ensureStudentsTable()

    const { searchParams } = new URL(request.url)
    const parsed = querySchema.parse(Object.fromEntries(searchParams))

    const department = String(parsed.department).trim()
    const publishedOnly = toBool(parsed.publishedOnly, false)
    const includeSecurity = toBool(parsed.includeSecurity, true)

    const requestedLimit = parsed.limit ? Number.parseInt(parsed.limit, 10) : undefined
    const limit =
      requestedLimit === undefined
        ? undefined
        : Number.isFinite(requestedLimit)
          ? Math.min(Math.max(requestedLimit, 1), 5000)
          : undefined

    const deptNorm = department.toLowerCase()

    const candidates = await dbQuery<CandidateRow>(
      `SELECT DISTINCT s.id, s.studentId
       FROM academic_module_exam_results r
       LEFT JOIN academic_module_courses c ON c.id = r.courseId
       LEFT JOIN academic_module_students s ON s.id = r.studentId
       WHERE s.id IS NOT NULL
         AND c.id IS NOT NULL
         AND LOWER(TRIM(COALESCE(c.department, ''))) = LOWER(TRIM(?))
         ${publishedOnly ? "AND r.isPublished = TRUE" : ""}
       ORDER BY s.studentId ASC
       ${limit ? `LIMIT ${limit}` : ""}`,
      [department],
    )

    const origin = new URL(request.url).origin

    const transcripts: TranscriptData[] = []

    for (const candidate of candidates || []) {
      const data = await buildTranscriptDataWithOptions(candidate.id, { publishedOnly })

      // Safety: filter out students whose inferred department doesn't match (reduces electives/noise).
      if (String(data.student.department || "").trim().toLowerCase() !== deptNorm) continue

      if (!includeSecurity) {
        transcripts.push(data)
        continue
      }

      const verificationUrl = `${origin}/transcript?studentId=${encodeURIComponent(
        data.student.studentId,
      )}&serial=${encodeURIComponent(data.serialNumber)}`
      const qrPayload = verificationUrl
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 160,
      })

      const security: TranscriptSecurity = {
        qrPayload,
        qrDataUrl,
        verificationUrl,
      }

      transcripts.push({ ...data, security })
    }

    const body: BulkTranscriptResponse = {
      success: true,
      department,
      count: transcripts.length,
      transcripts,
    }

    return NextResponse.json(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const body: BulkTranscriptResponse = { success: false, error: "Invalid parameters", details: error.errors }
      return NextResponse.json(body, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Failed to generate bulk transcripts"
    const body: BulkTranscriptResponse = { success: false, error: message }
    return NextResponse.json(body, { status: 500 })
  }
}
