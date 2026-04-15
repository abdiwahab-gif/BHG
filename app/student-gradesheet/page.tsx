"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { TranscriptDocument } from "@/components/reports/transcript-document"
import type { TranscriptData } from "@/types/transcript"
import { getAuditHeaders, getClientUser } from "@/lib/client-audit"
import { useToast } from "@/hooks/use-toast"

type GradesheetApiResponse =
  | { success: true; data: TranscriptData }
  | { success: false; error: string; details?: unknown }

export default function StudentGradesheetPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [studentIdInput, setStudentIdInput] = useState("")
  const [studentId, setStudentId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState("")

  const [data, setData] = useState<TranscriptData | null>(null)

  const canPublish = (() => {
    const user = getClientUser()
    const role = String((user as any)?.role || (user as any)?.userRole || "").trim().toLowerCase()
    return ["admin", "super_admin", "department_head"].includes(role)
  })()

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

    const fetchGradesheet = async (id: string) => {
      const res = await fetch(`/api/gradesheet?studentId=${encodeURIComponent(id)}`)
      const body = (await res.json().catch(() => null)) as GradesheetApiResponse | null
      if (!res.ok || !body || body.success === false) {
        const message = (body as any)?.error || "Failed to load gradesheet"
        throw new Error(message)
      }
      return body.data
    }

    const load = async () => {
      const id = String(studentId || "").trim()
      if (!id) return

      setIsLoading(true)
      setError("")

      try {
        const loaded = await fetchGradesheet(id)
        if (cancelled) return
        setData(loaded)
      } catch (err) {
        if (!cancelled) {
          setData(null)
          setError(err instanceof Error ? err.message : "Failed to load gradesheet")
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

  const publishForStudent = async () => {
    const id = String(studentId || studentIdInput || "").trim()
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

      // Reload gradesheet after publish even if the same ID is already loaded.
      const nextId = String(body?.data?.studentId || id).trim()
      const gradesheetRes = await fetch(`/api/gradesheet?studentId=${encodeURIComponent(nextId)}`)
      const gradesheetBody = (await gradesheetRes.json().catch(() => null)) as GradesheetApiResponse | null
      if (gradesheetRes.ok && gradesheetBody && gradesheetBody.success !== false) {
        setData(gradesheetBody.data)
      }

      setStudentId(nextId)
      router.replace(nextId ? `/student-gradesheet?studentId=${encodeURIComponent(nextId)}` : "/student-gradesheet")
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

  const printData = useMemo(() => data, [data])

  const handleLoad = () => {
    const id = String(studentIdInput || "").trim()
    setStudentId(id)
    router.replace(id ? `/student-gradesheet?studentId=${encodeURIComponent(id)}` : "/student-gradesheet")
  }

  return (
    <div className="min-h-screen bg-background py-6">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #gradesheet-print,
          #gradesheet-print * {
            visibility: visible !important;
          }
          #gradesheet-print {
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
              <CardTitle>Student Gradesheet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 max-w-md">
                <Input
                  placeholder="Enter student ID (e.g. 5588)"
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLoad()
                  }}
                />
                <Button onClick={handleLoad} disabled={isLoading}>
                  Load
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.print()} disabled={!printData}>
                  Print
                </Button>
                {canPublish ? (
                  <Button variant="outline" onClick={publishForStudent} disabled={isPublishing || (!studentId && !studentIdInput)}>
                    {isPublishing ? "Publishing…" : "Publish Results"}
                  </Button>
                ) : null}
              </div>

              {error ? <div className="text-sm text-destructive">{error}</div> : null}
              {isLoading ? <div className="text-sm text-muted-foreground">Loading gradesheet…</div> : null}
              <div className="text-xs text-muted-foreground">
                Shows published results only. This is not an official transcript.
              </div>
            </CardContent>
          </Card>
        </div>

        {printData ? (
          <div id="gradesheet-print">
            {Array.isArray(printData.terms) && printData.terms.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No published results found for this student.
              </div>
            ) : (
              <TranscriptDocument data={printData} variant="student" />
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
