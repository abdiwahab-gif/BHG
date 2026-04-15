import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { buildTranscriptDataWithOptions } from "@/lib/transcript"

const querySchema = z.object({
  studentId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { studentId } = querySchema.parse(Object.fromEntries(searchParams))

    const data = await buildTranscriptDataWithOptions(studentId, {
      publishedOnly: true,
      subtitle: "Student Gradesheet",
    })

    // Student-facing gradesheet should not include official-like security fields.
    data.security = undefined

    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid parameters", details: error.errors }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Failed to generate gradesheet"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
