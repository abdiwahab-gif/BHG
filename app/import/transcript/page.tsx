"use client"

import { useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { getAuditHeaders } from "@/lib/client-audit"

type ImportResult = {
  studentId: string
  studentNumber: string
  studentName: string
  faculty: string
  department: string
  program: string
  parsedRows: number
  createdCourses: number
  createdResults: number
  skippedResults: number
  warnings: string[]
}

export default function TranscriptImportPage() {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const canUpload = useMemo(() => {
    return Boolean(file && !uploading)
  }, [file, uploading])

  const upload = async () => {
    if (!file || uploading) return

    try {
      setUploading(true)
      setResult(null)

      const form = new FormData()
      form.append("file", file)

      const res = await fetch("/api/import/transcript", {
        method: "POST",
        headers: {
          ...getAuditHeaders(),
        },
        body: form,
      })

      const body = await res.json().catch(() => null)
      if (!res.ok) {
        const message = body?.message || body?.error || `Import failed (${res.status})`
        throw new Error(message)
      }

      const data = body?.data as ImportResult | undefined
      setResult(data || null)

      toast({
        title: "Import complete",
        description: data?.studentNumber
          ? `Imported transcript for ${data.studentNumber}`
          : "Transcript imported",
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to import transcript"
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Transcript CSV</CardTitle>
          <CardDescription>
            Upload the exported transcript-style CSV (e.g. 6617.csv) to create/update the student, courses, and exam results.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">CSV File</Label>
            <Input
              id="file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">
              This requires a logged-in user with permission to create students and exam results.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={upload} disabled={!canUpload}>
              {uploading ? "Uploading..." : "Upload & Import"}
            </Button>
            {file ? <span className="text-sm text-muted-foreground">{file.name}</span> : null}
          </div>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>Import Summary</CardTitle>
            <CardDescription>What was inserted/updated during this upload.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Student:</span> {result.studentName || ""} ({result.studentNumber || ""})
            </div>
            <div>
              <span className="text-muted-foreground">Faculty/Department:</span> {result.faculty || ""} / {result.department || ""}
            </div>
            <div>
              <span className="text-muted-foreground">Rows parsed:</span> {result.parsedRows}
            </div>
            <div>
              <span className="text-muted-foreground">Courses created:</span> {result.createdCourses}
            </div>
            <div>
              <span className="text-muted-foreground">Exam results created:</span> {result.createdResults}
            </div>
            <div>
              <span className="text-muted-foreground">Results skipped (duplicates):</span> {result.skippedResults}
            </div>

            {Array.isArray(result.warnings) && result.warnings.length ? (
              <div className="pt-2">
                <div className="font-medium">Warnings</div>
                <ul className="list-disc pl-5">
                  {result.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
