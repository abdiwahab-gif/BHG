import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import QRCode from "qrcode"
import { buildTranscriptDataWithOptions } from "@/lib/transcript"

const querySchema = z.object({
  studentId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { studentId } = querySchema.parse(Object.fromEntries(searchParams))

    const data = await buildTranscriptDataWithOptions(studentId)

    const origin = new URL(request.url).origin
    const verificationUrl = `${origin}/transcript?studentId=${encodeURIComponent(
      data.student.studentId,
    )}&serial=${encodeURIComponent(data.serialNumber)}`
    const qrPayload = verificationUrl
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 160,
    })

    return NextResponse.json({
      success: true,
      data,
      security: {
        qrPayload,
        qrDataUrl,
        verificationUrl,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid parameters", details: error.errors }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : "Failed to generate transcript"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
