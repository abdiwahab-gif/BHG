"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { TranscriptDocument } from "@/components/reports/transcript-document"
import type { TranscriptData, TranscriptSecurity } from "@/types/transcript"
import { getAuditHeaders } from "@/lib/client-audit"
import { useToast } from "@/hooks/use-toast"

type TranscriptApiResponse =
  | { success: true; data: TranscriptData; security: TranscriptSecurity }
  | { success: false; error: string; details?: unknown }

export default function TranscriptPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [studentIdInput, setStudentIdInput] = useState("")
  const [studentId, setStudentId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState("")

  const [baseData, setBaseData] = useState<TranscriptData | null>(null)
  const [security, setSecurity] = useState<TranscriptSecurity | null>(null)

  // Editable fields ("manage content")
  const [subtitle, setSubtitle] = useState("")
  const [serialNumber, setSerialNumber] = useState("")
  const [degreeGranted, setDegreeGranted] = useState("")
  const [dateGranted, setDateGranted] = useState("")

  useEffect(() => {
    const initial = (searchParams.get("studentId") || "").trim()
    if (initial) {
      setStudentIdInput(initial)
      setStudentId(initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const id = String(studentId || "").trim()
      if (!id) return

      setIsLoading(true)
      setError("")

      try {
        const res = await fetch(`/api/transcript?studentId=${encodeURIComponent(id)}`)
        const body = (await res.json().catch(() => null)) as TranscriptApiResponse | null

        if (!res.ok || !body || body.success === false) {
          const message = (body as any)?.error || "Failed to load transcript"
          throw new Error(message)
        }

        if (cancelled) return

        setBaseData(body.data)
        setSecurity(body.security)

        // Initialize editable fields from server defaults
        setSubtitle((prev) => prev || body.data.subtitle || "Student’s Official Transcript")
        setSerialNumber((prev) => prev || body.data.serialNumber || "")
        setDegreeGranted((prev) => prev || body.data.student.degreeGranted || "")
        setDateGranted((prev) => prev || body.data.student.dateGranted || "")
      } catch (err) {
        if (!cancelled) {
          setBaseData(null)
          setSecurity(null)
          setError(err instanceof Error ? err.message : "Failed to load transcript")
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [studentId])

  const previewData = useMemo<TranscriptData | null>(() => {
    if (!baseData) return null
    return {
      ...baseData,
      subtitle: subtitle || baseData.subtitle,
      serialNumber: serialNumber || baseData.serialNumber,
      student: {
        ...baseData.student,
        degreeGranted,
        dateGranted,
      },
      security: security || undefined,
    }
  }, [baseData, subtitle, serialNumber, degreeGranted, dateGranted, security])

  const handleGenerate = () => {
    const id = String(studentIdInput || "").trim()
    setStudentId(id)
    router.replace(id ? `/transcript?studentId=${encodeURIComponent(id)}` : "/transcript")
  }

  const handlePublish = async () => {
    const id = String(studentId || "").trim()
    if (!id) return

    setIsPublishing(true)
    setError("")

    try {
      const res = await fetch("/api/exam-results/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuditHeaders(),
        },
        body: JSON.stringify({ studentId: id }),
      })

      const body = await res.json().catch(() => null)
      if (!res.ok || !body || body.success === false) {
        const message = body?.error || "Failed to publish results"
        throw new Error(message)
      }

      const publishedCount = Number(body?.data?.publishedCount || 0)
      const totalResults = Number(body?.data?.totalResults ?? NaN)
      const publishedAfter = Number(body?.data?.publishedAfter ?? NaN)

      const totalsText = Number.isFinite(totalResults) && Number.isFinite(publishedAfter)
        ? ` Now ${publishedAfter}/${totalResults} published.`
        : ""

      toast({
        title: publishedCount > 0 ? "Published" : "No changes",
        description:
          publishedCount > 0
            ? `Published ${publishedCount} result(s) for student ${String(body?.data?.studentId || id)}.${totalsText}`
            : `No unpublished results found for student ${String(body?.data?.studentId || id)}.${totalsText}`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to publish results"
      setError(message)
      toast({
        title: "Publish failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background py-6">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #transcript-print,
          #transcript-print * {
            visibility: visible !important;
          }
          #transcript-print {
            position: absolute;
            inset: 0;
            width: 100%;
          }
        }
      `}</style>
      <div className="container mx-auto px-4 space-y-6">
        <div className="print:hidden">
          <Card>
            <CardHeader>
              <CardTitle>Generate Transcript</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <div className="text-sm font-medium mb-2">Student ID</div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. 5588"
                      value={studentIdInput}
                      onChange={(e) => setStudentIdInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleGenerate()
                      }}
                    />
                    <Button onClick={handleGenerate} disabled={isLoading}>
                      Load
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Enter the student business ID (like 5588) or the UUID.
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm font-medium mb-2">Subtitle</div>
                    <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Transcript subtitle" />
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">Serial Number</div>
                    <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="TR-..." />
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">Degree Granted</div>
                    <Input value={degreeGranted} onChange={(e) => setDegreeGranted(e.target.value)} placeholder="e.g. BSc ..." />
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">Date Granted</div>
                    <Input value={dateGranted} onChange={(e) => setDateGranted(e.target.value)} placeholder="YYYY-MM-DD" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.print()} disabled={!previewData}>
                  Print
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePublish}
                  disabled={!previewData || isPublishing}
                >
                  {isPublishing ? "Publishing…" : "Publish Results"}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/transcript/bulk">Bulk Print (Department)</Link>
                </Button>
              </div>

              {error ? <div className="text-sm text-destructive">{error}</div> : null}
              {isLoading ? <div className="text-sm text-muted-foreground">Loading transcript…</div> : null}
            </CardContent>
          </Card>
        </div>

        {previewData ? (
          <div id="transcript-print">
            <TranscriptDocument data={previewData} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
