"use client"

import { useEffect, useState } from "react"
import { BarChart3, TrendingUp, Users, FileText, Calendar, Plus, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ExamResultsDashboard } from "@/components/exam-results/exam-results-dashboard"
import { StudentPerformanceDashboard } from "@/components/exam-results/student-performance-dashboard"
import { AnalyticsDashboard } from "@/components/exam-results/analytics-dashboard"
import { ExamResultsTable } from "@/components/exam-results/exam-results-table"
import { AddExamResultForm } from "@/components/exam-results/add-exam-result-form"
import { BulkImportDialog } from "@/components/exam-results/bulk-import-dialog"

export default function ExamResultsPage() {
  const [sessions, setSessions] = useState<Array<{ id: string; name: string; isActive: boolean; examResultCount?: number }>>([])
  const [semesters, setSemesters] = useState<Array<{ id: string; name: string }>>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isLoadingSemesters, setIsLoadingSemesters] = useState(false)

  const [selectedSession, setSelectedSession] = useState("")
  const [selectedSemester, setSelectedSemester] = useState("")
  const [activeTab, setActiveTab] = useState("results")
  const [showAddForm, setShowAddForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [sessionWasAutoSelected, setSessionWasAutoSelected] = useState(false)
  const [scopeWasExplicitlySelected, setScopeWasExplicitlySelected] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadSessions = async () => {
      setIsLoadingSessions(true)
      try {
        const res = await fetch("/api/sessions")
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.message || body?.error || "Failed to fetch sessions")

        const list = Array.isArray(body?.data?.sessions) ? body.data.sessions : []
        const mapped = list.map((s: any) => ({
          id: String(s.id),
          name: String(s.name),
          isActive: Boolean(s.isActive),
          examResultCount: typeof s.examResultCount === "number" ? s.examResultCount : Number(s.examResultCount || 0),
        }))

        if (cancelled) return
        setSessions(mapped)

        const activeWithResults = mapped.find((s) => s.isActive && (s.examResultCount || 0) > 0)
        const anyWithResults = mapped.find((s) => (s.examResultCount || 0) > 0)
        const active = activeWithResults || anyWithResults || mapped.find((s) => s.isActive) || mapped[0]
        setSelectedSession((prev) => {
          const next = prev || (active ? active.id : "")
          setSessionWasAutoSelected(!prev && Boolean(next))
          return next
        })
      } catch {
        if (!cancelled) {
          setSessions([])
          setSelectedSession("")
          setSessionWasAutoSelected(false)
        }
      } finally {
        if (!cancelled) setIsLoadingSessions(false)
      }
    }

    void loadSessions()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadSemesters = async () => {
      if (!selectedSession) {
        setSemesters([])
        setSelectedSemester("")
        return
      }

      setIsLoadingSemesters(true)
      try {
        const res = await fetch(`/api/semesters?sessionId=${encodeURIComponent(selectedSession)}`)
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.message || body?.error || "Failed to fetch semesters")

        const list = Array.isArray(body?.data) ? body.data : []
        const mapped = list.map((s: any) => ({
          id: String(s.id),
          name: String(s.name),
        }))

        if (cancelled) return

        // If the auto-selected session has no semesters, try to auto-switch to a session that does.
        // Important: only do this once sessions have been loaded; otherwise we can "give up" too early.
        if (sessionWasAutoSelected && mapped.length === 0) {
          if (sessions.length === 0) {
            setSemesters(mapped)
            setSelectedSemester("")
            return
          }

          for (const s of sessions) {
            if (s.id === selectedSession) continue
            try {
              const altRes = await fetch(`/api/semesters?sessionId=${encodeURIComponent(s.id)}`)
              const altBody = await altRes.json().catch(() => null)
              const altList = Array.isArray(altBody?.data) ? altBody.data : []
              if (altRes.ok && altList.length > 0) {
                if (!cancelled) {
                  setSelectedSession(s.id)
                }
                return
              }
            } catch {
              // ignore and continue
            }
          }

          // Sessions are loaded but none have semesters
          setSemesters(mapped)
          setSelectedSemester("")
          setSessionWasAutoSelected(false)
          return
        }

        setSemesters(mapped)
        setSelectedSemester((prev) => prev || (mapped[0] ? mapped[0].id : ""))
        setSessionWasAutoSelected(false)
      } catch {
        if (!cancelled) {
          setSemesters([])
          setSelectedSemester("")
          // Keep auto-select enabled until sessions have loaded.
          if (sessions.length > 0) setSessionWasAutoSelected(false)
        }
      } finally {
        if (!cancelled) setIsLoadingSemesters(false)
      }
    }

    void loadSemesters()
    return () => {
      cancelled = true
    }
  }, [selectedSession, sessionWasAutoSelected, sessions])

  const handleFormSuccess = () => {
    setShowAddForm(false)
    setShowBulkImport(false)
    // Refresh data would happen here via SWR revalidation
  }

  const scopeForResults = scopeWasExplicitlySelected ? { sessionId: selectedSession, semesterId: selectedSemester } : { sessionId: "", semesterId: "" }

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 font-sans text-balance">
                Exam Results Management
              </h1>
              <p className="text-muted-foreground text-lg">
                Comprehensive exam results, analytics, and performance tracking
              </p>
            </div>

            {/* Session and Semester Filters + Action Buttons */}
            <div className="flex items-center gap-3">
              <Button onClick={() => setShowBulkImport(true)} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>

              <Button onClick={() => setShowAddForm(true)} disabled={!selectedSession || !selectedSemester}>
                <Plus className="h-4 w-4 mr-2" />
                Add Result
              </Button>

              <Select
                value={selectedSession}
                onValueChange={(val) => {
                  setScopeWasExplicitlySelected(true)
                  setSelectedSession(val)
                  setSelectedSemester("")
                }}
              >
                <SelectTrigger className="w-40">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingSessions ? (
                    <SelectItem value="__loading__" disabled>
                      Loading...
                    </SelectItem>
                  ) : sessions.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No sessions found
                    </SelectItem>
                  ) : (
                    sessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select
                value={selectedSemester}
                onValueChange={(val) => {
                  setScopeWasExplicitlySelected(true)
                  setSelectedSemester(val)
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingSemesters ? (
                    <SelectItem value="__loading__" disabled>
                      Loading...
                    </SelectItem>
                  ) : semesters.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No semesters found
                    </SelectItem>
                  ) : (
                    semesters.map((semester) => (
                      <SelectItem key={semester.id} value={semester.id}>
                        {semester.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val)
          }}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Students
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {selectedSession && selectedSemester ? (
              <ExamResultsDashboard sessionId={selectedSession} semesterId={selectedSemester} />
            ) : (
              <div className="text-sm text-muted-foreground">Select a session and semester to view data.</div>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <ExamResultsTable
              sessionId={scopeForResults.sessionId}
              semesterId={scopeForResults.semesterId}
              onNavigateScope={(sessionId, semesterId) => {
                setScopeWasExplicitlySelected(true)
                setSelectedSession(sessionId)
                setSelectedSemester(semesterId)
              }}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {selectedSession && selectedSemester ? (
              <AnalyticsDashboard sessionId={selectedSession} semesterId={selectedSemester} />
            ) : (
              <div className="text-sm text-muted-foreground">Select a session and semester to view analytics.</div>
            )}
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            {selectedSession && selectedSemester ? (
              <StudentPerformanceDashboard sessionId={selectedSession} semesterId={selectedSemester} />
            ) : (
              <div className="text-sm text-muted-foreground">Select a session and semester to view student performance.</div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <AddExamResultForm
            sessionId={selectedSession}
            semesterId={selectedSemester}
            onSuccess={handleFormSuccess}
            onCancel={() => setShowAddForm(false)}
          />
        </DialogContent>
      </Dialog>

      <BulkImportDialog isOpen={showBulkImport} onOpenChange={setShowBulkImport} onSuccess={handleFormSuccess} />
    </div>
  )
}
