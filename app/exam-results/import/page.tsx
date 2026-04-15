"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { getAuditHeaders } from "@/lib/client-audit"

import { ArrowLeft, Download, Upload, CheckCircle2, AlertTriangle, Play, RotateCcw } from "lucide-react"

type InitResponse = {
  jobId: string
  fileName: string
  fileType: string
  headers: string[]
  totalRows: number
  sampleRows: Array<Record<string, string>>
}

type Mapping = {
  studentId: string
  courseId?: string
  courseCode?: string
  courseName?: string
  academicYear: string
  semester: string
  midScore?: string
  finalScore?: string
  assignmentScore?: string
  attendanceScore?: string
  comments?: string
}

type PreviewRowError = { field: string; message: string; value?: string }

type PreviewRow = {
  operationId: string
  rowNumber: number
  studentId: string
  course: string
  examTypeCode: string
  academicYear: string
  semester: string
  score: number
  maxScore: number
  action?: "INSERT" | "UPDATE"
  errors: PreviewRowError[]
}

type PreviewResponse = {
  jobId: string
  stats: { total: number; valid: number; invalid: number; inserts: number; updates: number }
  previewRows: PreviewRow[]
}

type JobListItem = {
  id: string
  status: string
  fileName: string
  fileType: string
  stats: any
  createdBy: { id: string; role: string; name: string }
  createdAt: string
}

function guessHeader(headers: string[], candidates: string[]): string {
  const normalized = new Map(headers.map((h) => [h.toLowerCase().replace(/\s+/g, "_"), h]))
  for (const c of candidates) {
    const key = c.toLowerCase().replace(/\s+/g, "_")
    const found = normalized.get(key)
    if (found) return found
  }
  return ""
}

export default function ExamResultsImporterPage() {
  const NONE_VALUE = "__none__"

  const { toast } = useToast()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<"upload" | "mapping" | "preview" | "history">("upload")

  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)

  const [init, setInit] = useState<InitResponse | null>(null)
  const [initializing, setInitializing] = useState(false)

  const [mapping, setMapping] = useState<Mapping | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [commitResult, setCommitResult] = useState<{ inserted: number; updated: number; skipped: number } | null>(null)

  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [loadingJobs, setLoadingJobs] = useState(false)

  const headers = init?.headers || []

  const requiredMappingOk = useMemo(() => {
    if (!mapping) return false
    if (!mapping.studentId) return false
    if (!mapping.academicYear) return false
    if (!mapping.semester) return false
    if (!mapping.courseId && !mapping.courseCode && !mapping.courseName) return false
    if (!mapping.midScore && !mapping.finalScore && !mapping.assignmentScore && !mapping.attendanceScore) return false
    return true
  }, [mapping])

  const downloadTemplate = async () => {
    try {
      const res = await fetch("/api/import/exam-results/template", { cache: "no-store", headers: { ...getAuditHeaders() } })
      if (!res.ok) throw new Error("Failed to download template")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "exam-results-import-template.csv"
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to download template", variant: "destructive" })
    }
  }

  const initJob = async () => {
    if (!file) return
    try {
      setInitializing(true)
      setInit(null)
      setPreview(null)
      setCommitResult(null)

      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/import/exam-results/init", {
        method: "POST",
        headers: { ...getAuditHeaders() },
        body: form,
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.message || body?.error || `Init failed (${res.status})`)
      }
      const data = body?.data as InitResponse
      setInit(data)

      const auto: Mapping = {
        studentId: guessHeader(data.headers, ["student_id", "studentId", "registration_number", "registrationNumber", "student_number", "studentNumber"]),
        courseId: guessHeader(data.headers, ["course_id", "courseId", "course_uuid", "courseUuid"]),
        courseCode: guessHeader(data.headers, ["course_code", "courseCode", "code"]),
        courseName: guessHeader(data.headers, ["course_name", "courseName", "course", "name"]),
        academicYear: guessHeader(data.headers, ["academic_year", "year", "session", "session_name"]),
        semester: guessHeader(data.headers, ["semester", "term"]),
        midScore: guessHeader(data.headers, ["mid_score", "mid", "midterm", "midterm_score"]),
        finalScore: guessHeader(data.headers, ["final_score", "final", "final_score"]),
        assignmentScore: guessHeader(data.headers, ["assignment_score", "assignment", "assign", "assign_score"]),
        attendanceScore: guessHeader(data.headers, ["attendance_score", "attendance", "att", "att_score"]),
        comments: guessHeader(data.headers, ["comments", "comment", "remark", "remarks"]),
      }
      // Prefer courseId > courseCode > courseName.
      if (auto.courseId) {
        auto.courseCode = ""
        auto.courseName = ""
      } else if (auto.courseCode && auto.courseName) {
        auto.courseName = ""
      }
      setMapping(auto)

      setActiveTab("mapping")
      toast({ title: "File uploaded", description: `Loaded ${data.totalRows} rows` })
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to initialize import", variant: "destructive" })
    } finally {
      setInitializing(false)
    }
  }

  const previewImport = async () => {
    if (!init?.jobId || !mapping) return
    if (!requiredMappingOk) {
      toast({ title: "Missing mapping", description: "Map all required fields before preview", variant: "destructive" })
      return
    }

    try {
      setPreviewing(true)
      setPreview(null)
      setCommitResult(null)

      const res = await fetch("/api/import/exam-results/preview", {
        method: "POST",
        headers: { "content-type": "application/json", ...getAuditHeaders() },
        body: JSON.stringify({ jobId: init.jobId, mapping }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.message || body?.error || `Preview failed (${res.status})`)
      }

      const data = body?.data as PreviewResponse
      setPreview(data)
      setActiveTab("preview")
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to preview import", variant: "destructive" })
    } finally {
      setPreviewing(false)
    }
  }

  const commitImport = async () => {
    if (!init?.jobId) return
    if (!preview?.stats || preview.stats.invalid > 0) {
      toast({ title: "Fix errors", description: "Resolve validation errors before committing.", variant: "destructive" })
      return
    }

    try {
      setCommitting(true)
      const res = await fetch("/api/import/exam-results/commit", {
        method: "POST",
        headers: { "content-type": "application/json", ...getAuditHeaders() },
        body: JSON.stringify({ jobId: init.jobId }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.message || body?.error || `Commit failed (${res.status})`)
      }
      setCommitResult(body?.data || null)
      toast({ title: "Import committed", description: "Exam results have been written to the database." })
      await loadJobs()
      setActiveTab("history")
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to commit import", variant: "destructive" })
    } finally {
      setCommitting(false)
    }
  }

  const rollbackJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/import/exam-results/jobs/${encodeURIComponent(jobId)}/rollback`, {
        method: "POST",
        headers: { ...getAuditHeaders() },
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.message || body?.error || `Rollback failed (${res.status})`)
      }
      toast({ title: "Rollback complete", description: `Job ${jobId} rolled back.` })
      await loadJobs()
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to rollback", variant: "destructive" })
    }
  }

  const loadJobs = async () => {
    try {
      setLoadingJobs(true)
      const res = await fetch("/api/import/exam-results/jobs", { cache: "no-store", headers: { ...getAuditHeaders() } })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.message || body?.error || "Failed to load jobs")
      const items = Array.isArray(body?.data?.items) ? (body.data.items as JobListItem[]) : []
      setJobs(items)
    } catch {
      setJobs([])
    } finally {
      setLoadingJobs(false)
    }
  }

  useEffect(() => {
    void loadJobs()
  }, [])

  const onDrop = (f: File | null) => {
    setFile(f)
    setInit(null)
    setMapping(null)
    setPreview(null)
    setCommitResult(null)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/exam-results">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Exam Results
          </Link>
        </Button>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Download CSV Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Exam Results Importer</CardTitle>
          <CardDescription>
            Upload CSV/XLSX, map columns, preview validation, then commit with UPSERT (update existing results, insert new).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upload">1. Upload</TabsTrigger>
              <TabsTrigger value="mapping" disabled={!init}>2. Mapping</TabsTrigger>
              <TabsTrigger value="preview" disabled={!preview}>3. Preview</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 pt-4">
              <div
                className={
                  "flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors " +
                  (dragging ? "border-primary" : "border-border")
                }
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  const f = e.dataTransfer.files?.[0] || null
                  onDrop(f)
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <div className="text-sm text-muted-foreground">Click to upload or drag & drop</div>
                <div className="text-xs text-muted-foreground">CSV (.csv) or Excel (.xlsx)</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx"
                  onChange={(e) => onDrop(e.target.files?.[0] || null)}
                />
              </div>

              {file ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Selected:</span> {file.name}
                  </div>
                  <Button onClick={initJob} disabled={initializing}>
                    {initializing ? "Uploading..." : "Upload & Analyze"}
                  </Button>
                </div>
              ) : null}

              {init ? (
                <div className="text-sm text-muted-foreground">Loaded {init.totalRows} rows. Continue to mapping.</div>
              ) : null}
            </TabsContent>

            <TabsContent value="mapping" className="space-y-4 pt-4">
              {!init ? (
                <div className="text-sm text-muted-foreground">Upload a file first.</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Student ID (required)</Label>
                      <Select value={mapping?.studentId || ""} onValueChange={(v) => setMapping((m) => ({ ...(m as any), studentId: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Academic Year / Session Name (required)</Label>
                      <Select value={mapping?.academicYear || ""} onValueChange={(v) => setMapping((m) => ({ ...(m as any), academicYear: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Semester (required)</Label>
                      <Select value={mapping?.semester || ""} onValueChange={(v) => setMapping((m) => ({ ...(m as any), semester: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Course ID (recommended if you have it)</Label>
                      <Select
                        value={mapping?.courseId || ""}
                        onValueChange={(v) => setMapping((m) => ({ ...(m as any), courseId: v === NONE_VALUE ? undefined : v || undefined }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>(none)</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground">If set, courseCode/courseName can be empty.</div>
                    </div>

                    <div className="space-y-2">
                      <Label>Course Code (required if Course Name empty)</Label>
                      <Select
                        value={mapping?.courseCode || ""}
                        onValueChange={(v) => setMapping((m) => ({ ...(m as any), courseCode: v === NONE_VALUE ? undefined : v || undefined }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>(none)</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Course Name (required if Course Code empty)</Label>
                      <Select
                        value={mapping?.courseName || ""}
                        onValueChange={(v) => setMapping((m) => ({ ...(m as any), courseName: v === NONE_VALUE ? undefined : v || undefined }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>(none)</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Midterm Score (at least one score column required)</Label>
                      <Select
                        value={mapping?.midScore || ""}
                        onValueChange={(v) => setMapping((m) => ({ ...(m as any), midScore: v === NONE_VALUE ? undefined : v || undefined }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>(none)</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Final Score</Label>
                      <Select
                        value={mapping?.finalScore || ""}
                        onValueChange={(v) => setMapping((m) => ({ ...(m as any), finalScore: v === NONE_VALUE ? undefined : v || undefined }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>(none)</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Assignment Score</Label>
                      <Select
                        value={mapping?.assignmentScore || ""}
                        onValueChange={(v) => setMapping((m) => ({ ...(m as any), assignmentScore: v === NONE_VALUE ? undefined : v || undefined }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>(none)</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Attendance Score</Label>
                      <Select
                        value={mapping?.attendanceScore || ""}
                        onValueChange={(v) => setMapping((m) => ({ ...(m as any), attendanceScore: v === NONE_VALUE ? undefined : v || undefined }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>(none)</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Comments (optional)</Label>
                      <Select
                        value={mapping?.comments || ""}
                        onValueChange={(v) => setMapping((m) => ({ ...(m as any), comments: v === NONE_VALUE ? undefined : v || undefined }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>(none)</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                      {requiredMappingOk ? (
                        <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Mapping OK</span>
                      ) : (
                        <span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-muted-foreground" /> Map all required fields</span>
                      )}
                    </div>
                    <Button onClick={previewImport} disabled={previewing || !requiredMappingOk}>
                      <Play className="h-4 w-4 mr-2" />
                      {previewing ? "Validating..." : "Preview & Validate"}
                    </Button>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Sample Rows</CardTitle>
                      <CardDescription>Quick sanity-check before preview.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {headers.slice(0, 8).map((h) => (
                                <TableHead key={h}>{h}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(init.sampleRows || []).map((r, idx) => (
                              <TableRow key={idx}>
                                {headers.slice(0, 8).map((h) => (
                                  <TableCell key={h}>{String(r[h] || "")}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="preview" className="space-y-4 pt-4">
              {!preview ? (
                <div className="text-sm text-muted-foreground">Run preview first.</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader>
                      <CardContent className="text-2xl font-bold">{preview.stats.total}</CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Inserts</CardTitle></CardHeader>
                      <CardContent className="text-2xl font-bold">{preview.stats.inserts}</CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Updates</CardTitle></CardHeader>
                      <CardContent className="text-2xl font-bold">{preview.stats.updates}</CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Errors</CardTitle></CardHeader>
                      <CardContent className="text-2xl font-bold">{preview.stats.invalid}</CardContent>
                    </Card>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                      {preview.stats.invalid > 0 ? "Fix errors before commit." : "Ready to commit."}
                    </div>
                    <Button onClick={commitImport} disabled={committing || preview.stats.invalid > 0}>
                      {committing ? "Committing..." : "Confirm & Commit Import"}
                    </Button>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Preview (first 50 exam records)</CardTitle>
                      <CardDescription>One input row expands into multiple exam records.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Row</TableHead>
                              <TableHead>Student</TableHead>
                              <TableHead>Course</TableHead>
                              <TableHead>Exam</TableHead>
                              <TableHead>Year</TableHead>
                              <TableHead>Semester</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Errors</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {preview.previewRows.map((r) => (
                              <TableRow key={r.operationId} className={r.errors.length ? "bg-destructive/10" : ""}>
                                <TableCell>{r.rowNumber}</TableCell>
                                <TableCell>{r.studentId}</TableCell>
                                <TableCell>{r.course}</TableCell>
                                <TableCell>{r.examTypeCode}</TableCell>
                                <TableCell>{r.academicYear}</TableCell>
                                <TableCell>{r.semester}</TableCell>
                                <TableCell>
                                  {String(r.score)} / {String(r.maxScore)}
                                </TableCell>
                                <TableCell>
                                  {r.action ? <Badge variant="outline">{r.action}</Badge> : null}
                                </TableCell>
                                <TableCell>
                                  {r.errors.length ? (
                                    <div className="text-xs text-destructive space-y-1">
                                      {r.errors.slice(0, 3).map((e, idx) => (
                                        <div key={idx}>[{e.field}] {e.message}</div>
                                      ))}
                                      {r.errors.length > 3 ? <div>+{r.errors.length - 3} more</div> : null}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">OK</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Recent import jobs.</div>
                <Button variant="outline" onClick={loadJobs} disabled={loadingJobs}>
                  {loadingJobs ? "Refreshing..." : "Refresh"}
                </Button>
              </div>

              {commitResult ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Last Commit</CardTitle>
                    <CardDescription>Summary of the last committed import in this session.</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm">
                    Inserted: <strong>{commitResult.inserted}</strong> | Updated: <strong>{commitResult.updated}</strong> | Skipped: <strong>{commitResult.skipped}</strong>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Import Jobs</CardTitle>
                  <CardDescription>Track imports and rollback committed jobs if needed.</CardDescription>
                </CardHeader>
                <CardContent>
                  {jobs.length ? (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Created</TableHead>
                            <TableHead>File</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Stats</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {jobs.map((j) => (
                            <TableRow key={j.id}>
                              <TableCell className="text-xs">{new Date(j.createdAt).toLocaleString()}</TableCell>
                              <TableCell>
                                <div className="font-medium">{j.fileName}</div>
                                <div className="text-xs text-muted-foreground">{j.fileType}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{j.status}</Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {j.stats ? JSON.stringify(j.stats) : ""}
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button variant="outline" size="sm" onClick={() => router.push(`/api/import/exam-results/jobs/${encodeURIComponent(j.id)}`)}>
                                  View JSON
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={j.status !== "COMMITTED"}
                                  onClick={() => rollbackJob(j.id)}
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Rollback
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No import jobs yet.</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
