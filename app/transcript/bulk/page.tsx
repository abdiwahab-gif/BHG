"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TranscriptDocument } from "@/components/reports/transcript-document"
import type { TranscriptData } from "@/types/transcript"
import { useToast } from "@/hooks/use-toast"

type DepartmentsApiResponse =
  | { success: true; departments: string[] }
  | { success: false; error: string; details?: unknown }

type BulkApiResponse =
  | { success: true; department: string; count: number; transcripts: TranscriptData[] }
  | { success: false; error: string; details?: unknown }

export default function TranscriptBulkPrintPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [departments, setDepartments] = useState<string[]>([])
  const [department, setDepartment] = useState("")

  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false)
  const [isLoadingTranscripts, setIsLoadingTranscripts] = useState(false)
  const [error, setError] = useState("")

  const [transcripts, setTranscripts] = useState<TranscriptData[]>([])

  const canPrint = transcripts.length > 0 && !isLoadingTranscripts

  const loadDepartments = async () => {
    setIsLoadingDepartments(true)
    setError("")

    try {
      const res = await fetch("/api/transcript/departments")
      const body = (await res.json().catch(() => null)) as DepartmentsApiResponse | null

      if (!res.ok || !body || body.success === false) {
        const message = (body as any)?.error || "Failed to load departments"
        throw new Error(message)
      }

      setDepartments(Array.isArray(body.departments) ? body.departments : [])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load departments"
      setError(message)
      toast({ title: "Load failed", description: message, variant: "destructive" })
    } finally {
      setIsLoadingDepartments(false)
    }
  }

  const loadBulk = async (dept: string) => {
    const d = String(dept || "").trim()
    if (!d) return

    setIsLoadingTranscripts(true)
    setError("")
    setTranscripts([])

    try {
      const res = await fetch(`/api/transcript/bulk?department=${encodeURIComponent(d)}`)
      const body = (await res.json().catch(() => null)) as BulkApiResponse | null

      if (!res.ok || !body || body.success === false) {
        const message = (body as any)?.error || "Failed to generate bulk transcripts"
        throw new Error(message)
      }

      const items = Array.isArray(body.transcripts) ? body.transcripts : []
      setTranscripts(items)

      toast({
        title: "Ready to print",
        description: items.length ? `Loaded ${items.length} transcript(s) for ${d}.` : `No transcripts found for ${d}.`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate bulk transcripts"
      setError(message)
      toast({ title: "Generate failed", description: message, variant: "destructive" })
    } finally {
      setIsLoadingTranscripts(false)
    }
  }

  useEffect(() => {
    void loadDepartments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const initialDept = String(searchParams.get("department") || "").trim()
    if (!initialDept) return
    setDepartment(initialDept)
    void loadBulk(initialDept)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const headerText = useMemo(() => {
    if (!department) return "Bulk Print Transcripts"
    return `Bulk Print — ${department}`
  }, [department])

  const handleLoad = () => {
    const d = String(department || "").trim()
    router.replace(d ? `/transcript/bulk?department=${encodeURIComponent(d)}` : "/transcript/bulk")
    void loadBulk(d)
  }

  return (
    <div className="min-h-screen bg-background py-6">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #bulk-transcript-print,
          #bulk-transcript-print * {
            visibility: visible !important;
          }
          #bulk-transcript-print {
            position: absolute;
            inset: 0;
            width: 100%;
          }
          .bulk-transcript-break {
            break-after: page;
            page-break-after: always;
          }
        }
      `}</style>

      <div className="container mx-auto px-4 space-y-6">
        <div className="print:hidden">
          <Card>
            <CardHeader>
              <CardTitle>{headerText}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <div className="text-sm font-medium mb-2">Department</div>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="w-full" disabled={isLoadingDepartments}>
                      <SelectValue placeholder={isLoadingDepartments ? "Loading departments…" : "Select a department"} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Prints the transcript for every student whose transcript department matches the selected department.
                  </div>
                </div>

                <div className="md:col-span-1 flex md:justify-end items-end gap-2">
                  <Button variant="outline" onClick={() => void loadDepartments()} disabled={isLoadingDepartments}>
                    Refresh
                  </Button>
                  <Button onClick={handleLoad} disabled={!department || isLoadingTranscripts}>
                    {isLoadingTranscripts ? "Loading…" : "Load"}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.print()} disabled={!canPrint}>
                  Print
                </Button>
                <div className="text-sm text-muted-foreground self-center">
                  {transcripts.length ? `${transcripts.length} transcript(s) loaded.` : ""}
                </div>
              </div>

              {error ? <div className="text-sm text-destructive">{error}</div> : null}
            </CardContent>
          </Card>
        </div>

        {transcripts.length ? (
          <div id="bulk-transcript-print">
            {transcripts.map((t, idx) => {
              const isLast = idx === transcripts.length - 1
              return (
                <div key={`${t.serialNumber}-${idx}`} className={!isLast ? "bulk-transcript-break" : ""}>
                  <TranscriptDocument data={t} />
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
