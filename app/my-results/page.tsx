"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import type { TranscriptData, TranscriptTerm, TranscriptCourse } from "@/types/transcript"
import { getClientUser } from "@/lib/client-audit"

type GradesheetApiResponse =
  | { success: true; data: TranscriptData }
  | { success: false; error: string; details?: unknown }

function groupByAcademicYear(terms: TranscriptTerm[]) {
  const map = new Map<string, TranscriptTerm[]>()
  for (const t of terms) {
    const list = map.get(t.academicYear) || []
    list.push(t)
    map.set(t.academicYear, list)
  }

  const years = Array.from(map.keys()).sort()
  return years.map((y) => ({ academicYear: y, terms: map.get(y) || [] }))
}

function termOrderKey(term: TranscriptTerm) {
  // Spring first, Fall second (matches transcript ordering)
  const order = term.term === "Spring Semester" ? 0 : 1
  return `${term.academicYear}::${order}`
}

function fmt2(value: unknown) {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n.toFixed(2) : "0.00"
}

function gradeBadgeClass(grade: string) {
  const g = String(grade || "").trim().toUpperCase()

  if (g === "A") return "bg-primary/15 text-primary border-primary/25"
  if (g === "B") return "bg-secondary text-secondary-foreground border-border"
  if (g === "C") return "bg-accent text-accent-foreground border-border"
  if (g === "D") return "bg-muted text-muted-foreground border-border"
  if (g === "F") return "bg-destructive/15 text-destructive border-destructive/25"

  return "bg-muted text-muted-foreground border-border"
}

function CourseRow({ course }: { course: TranscriptCourse }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card/40 p-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-[11px]">
            {course.code}
          </Badge>
          <div className="text-sm font-medium leading-snug break-words">{course.title}</div>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Credit Hours: <span className="tabular-nums text-foreground/80">{course.creditHours}</span>
          <span className="mx-2">•</span>
          Honor Points: <span className="tabular-nums text-foreground/80">{course.honorPoints}</span>
        </div>
      </div>

      <Badge className={`shrink-0 border ${gradeBadgeClass(course.grade)}`}>{course.grade}</Badge>
    </div>
  )
}

function TermCard({ term }: { term: TranscriptTerm }) {
  const courseCount = Array.isArray(term.courses) ? term.courses.length : 0

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{term.term}</CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">
              {term.academicYear} • {courseCount} course{courseCount === 1 ? "" : "s"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">GPA</div>
            <div className="text-lg font-semibold tabular-nums">{fmt2(term.gpaCurrent)}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <div className="text-[11px] text-muted-foreground">Credits (Term)</div>
            <div className="text-sm font-medium tabular-nums">{term.creditHoursCurrent}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <div className="text-[11px] text-muted-foreground">Credits (Total)</div>
            <div className="text-sm font-medium tabular-nums">{term.creditHoursCumulative}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {term.courses.map((c) => (
          <CourseRow key={`${term.academicYear}-${term.term}-${c.code}-${c.title}`} course={c} />
        ))}
      </CardContent>
    </Card>
  )
}

function getStudentIdFromUser(): string {
  const user = getClientUser() as any
  if (!user) return ""

  const candidates = [
    user.studentId,
    user.studentNumber,
    user.personId,
    user.profileId,
    user.id,
  ]

  for (const c of candidates) {
    const v = String(c ?? "").trim()
    if (v) return v
  }

  return ""
}

export default function MyResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [studentId, setStudentId] = useState("")
  const [studentIdInput, setStudentIdInput] = useState("")

  const [data, setData] = useState<TranscriptData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const fromQuery = String(searchParams.get("studentId") || "").trim()
    const fromUser = getStudentIdFromUser()

    const initial = fromQuery || fromUser
    if (initial) {
      setStudentId(initial)
      setStudentIdInput(initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const id = String(studentId || "").trim()
      if (!id) {
        setData(null)
        return
      }

      setIsLoading(true)
      setError("")

      try {
        const res = await fetch(`/api/gradesheet?studentId=${encodeURIComponent(id)}`)
        const body = (await res.json().catch(() => null)) as GradesheetApiResponse | null

        if (!res.ok || !body || body.success === false) {
          const message = (body as any)?.error || "Failed to load results"
          throw new Error(message)
        }

        if (cancelled) return
        setData(body.data)
      } catch (err) {
        if (!cancelled) {
          setData(null)
          setError(err instanceof Error ? err.message : "Failed to load results")
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

  const viewModel = useMemo(() => {
    const terms = Array.isArray(data?.terms) ? data!.terms.slice().sort((a, b) => (termOrderKey(a) < termOrderKey(b) ? -1 : 1)) : []
    const totalCourses = terms.reduce((sum, t) => sum + (Array.isArray(t.courses) ? t.courses.length : 0), 0)
    const years = groupByAcademicYear(terms)

    return {
      terms,
      years,
      totalCourses,
      totalTerms: terms.length,
    }
  }, [data])

  const handleLoad = () => {
    const id = String(studentIdInput || "").trim()
    setStudentId(id)
    router.replace(id ? `/my-results?studentId=${encodeURIComponent(id)}` : "/my-results")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
              Published results only
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">My Results</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View your academic results by year and term.
            </p>
          </div>

          <div className="w-full sm:w-auto">
            <div className="flex gap-2">
              <Input
                placeholder="Student ID"
                value={studentIdInput}
                onChange={(e) => setStudentIdInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLoad()
                }}
                className="sm:w-[220px]"
              />
              <Button onClick={handleLoad} disabled={isLoading}>
                Load
              </Button>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              If this is your account, it should auto-load.
            </div>
          </div>
        </div>

        <Card className="bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {data ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-4">
                    <div className="text-xs text-muted-foreground">Student</div>
                    <div className="mt-1 text-sm font-medium break-words">{data.student.studentName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">ID: {data.student.studentId}</div>
                  </div>

                  <div className="rounded-xl border border-border bg-gradient-to-br from-secondary/40 via-background to-background p-4">
                    <div className="text-xs text-muted-foreground">CGPA</div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">{data.student.cgpa}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {viewModel.totalTerms} term{viewModel.totalTerms === 1 ? "" : "s"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-gradient-to-br from-accent/30 via-background to-background p-4">
                    <div className="text-xs text-muted-foreground">Courses</div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">{viewModel.totalCourses}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Total published courses</div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="text-sm">
                    <div className="text-xs text-muted-foreground">Faculty</div>
                    <div className="font-medium">{data.student.faculty}</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-xs text-muted-foreground">Department</div>
                    <div className="font-medium">{data.student.department}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Enter your Student ID to view results.
              </div>
            )}
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-destructive/40">
            <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        {isLoading ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">Loading results…</CardContent>
          </Card>
        ) : null}

        {data && !isLoading ? (
          viewModel.terms.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">No Published Results</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Your results are not published yet. Please check again later.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {viewModel.years.map((y) => (
                <section key={y.academicYear} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Academic Year {y.academicYear}</h2>
                    <Badge variant="secondary">{y.terms.length} term{y.terms.length === 1 ? "" : "s"}</Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {y.terms
                      .slice()
                      .sort((a, b) => (termOrderKey(a) < termOrderKey(b) ? -1 : 1))
                      .map((t) => (
                        <TermCard key={`${t.academicYear}-${t.term}`} term={t} />
                      ))}
                  </div>
                </section>
              ))}
            </div>
          )
        ) : null}

        <div className="text-xs text-muted-foreground">
          Student view: for information only. Not an official transcript.
        </div>
      </div>
    </div>
  )
}
