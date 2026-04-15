"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Download, FileText, BarChart3, Users, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useGenerateTranscript, useGenerateResultSlips, useExportAnalytics } from "@/hooks/use-reports"
import { useQuery } from "@tanstack/react-query"

type SessionItem = { id: string; name: string; isActive: boolean }
type StudentItem = { id: string; firstName: string; lastName: string; className?: string }

async function fetchSessions(): Promise<SessionItem[]> {
  const res = await fetch("/api/sessions")
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.message || body?.error || "Failed to fetch sessions")
  const sessions = body?.data?.sessions
  return Array.isArray(sessions) ? (sessions as SessionItem[]) : []
}

async function fetchSampleStudents(): Promise<StudentItem[]> {
  const res = await fetch("/api/students?limit=3")
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.message || body?.error || "Failed to fetch students")
  return Array.isArray(body?.students) ? (body.students as StudentItem[]) : []
}

export function ReportsPanel() {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>("")
  const [reportOptions, setReportOptions] = useState({
    format: "pdf",
    includeGrades: true,
    includeAttendance: false,
    includeComments: false,
    officialSeal: false,
  })

  const generateTranscript = useGenerateTranscript()
  const generateResultSlips = useGenerateResultSlips()
  const exportAnalytics = useExportAnalytics()

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: fetchSessions,
    staleTime: 5 * 60 * 1000,
  })

  const { data: sampleStudents = [] } = useQuery({
    queryKey: ["students", "sample"],
    queryFn: fetchSampleStudents,
    staleTime: 2 * 60 * 1000,
  })

  const resolvedSessionId =
    selectedSessionId || sessions.find((s) => s.isActive)?.id || sessions[0]?.id || ""

  const handleGenerateTranscript = (studentId: string) => {
    generateTranscript.mutate({
      studentId,
      sessionId: resolvedSessionId || undefined,
      format: reportOptions.format as "pdf" | "json",
      includeGrades: reportOptions.includeGrades,
      includeAttendance: reportOptions.includeAttendance,
      officialSeal: reportOptions.officialSeal,
    })
  }

  const handleGenerateResultSlips = () => {
    if (selectedStudents.length === 0) return
    if (!resolvedSessionId) return

    generateResultSlips.mutate({
      studentIds: selectedStudents,
      sessionId: resolvedSessionId,
      format: reportOptions.format as "pdf" | "json",
      includeGrades: reportOptions.includeGrades,
      includeComments: reportOptions.includeComments,
    })
  }

  const handleExportAnalytics = (reportType: string) => {
    exportAnalytics.mutate({
      reportType: reportType as any,
      format: reportOptions.format as "excel" | "csv" | "pdf",
      sessionId: resolvedSessionId || undefined,
    })
  }

  return (
    <div className="space-y-6">
      {/* Report Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Options
          </CardTitle>
          <CardDescription>Configure report generation settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={reportOptions.format}
                onValueChange={(value) => setReportOptions((prev) => ({ ...prev, format: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Include Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeGrades"
                    checked={reportOptions.includeGrades}
                    onCheckedChange={(checked) => setReportOptions((prev) => ({ ...prev, includeGrades: !!checked }))}
                  />
                  <Label htmlFor="includeGrades" className="text-sm">
                    Include Grades
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeAttendance"
                    checked={reportOptions.includeAttendance}
                    onCheckedChange={(checked) =>
                      setReportOptions((prev) => ({ ...prev, includeAttendance: !!checked }))
                    }
                  />
                  <Label htmlFor="includeAttendance" className="text-sm">
                    Include Attendance
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Additional Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeComments"
                    checked={reportOptions.includeComments}
                    onCheckedChange={(checked) => setReportOptions((prev) => ({ ...prev, includeComments: !!checked }))}
                  />
                  <Label htmlFor="includeComments" className="text-sm">
                    Include Comments
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="officialSeal"
                    checked={reportOptions.officialSeal}
                    onCheckedChange={(checked) => setReportOptions((prev) => ({ ...prev, officialSeal: !!checked }))}
                  />
                  <Label htmlFor="officialSeal" className="text-sm">
                    Official Seal
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Session Filter</Label>
              <Select value={resolvedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger>
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sessions.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No sessions found</div>
                  ) : (
                    sessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Student Transcripts */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Student Transcripts
              </CardTitle>
              <CardDescription>Generate official academic transcripts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sample Students</Label>
                <div className="space-y-2">
                  {sampleStudents.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No students found.</div>
                  ) : (
                    sampleStudents.map((student) => {
                      const name = `${student.firstName} ${student.lastName}`.trim()
                      const program = student.className || ""
                      return (
                        <div key={student.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium">{name}</div>
                            <div className="text-sm text-muted-foreground">{program || "-"}</div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleGenerateTranscript(student.id)}
                            disabled={generateTranscript.isPending || !resolvedSessionId}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Generate
                          </Button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Result Slips */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Result Slips
              </CardTitle>
              <CardDescription>Generate exam result slips for students</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Selected Students</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedStudents.length} selected</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStudents(sampleStudents.map((s) => s.id))}
                    disabled={sampleStudents.length === 0}
                  >
                    Select All
                  </Button>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleGenerateResultSlips}
                disabled={selectedStudents.length === 0 || generateResultSlips.isPending || !resolvedSessionId}
              >
                <Download className="h-4 w-4 mr-2" />
                Generate Result Slips
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Analytics Reports */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analytics Reports
              </CardTitle>
              <CardDescription>Export detailed analytics and insights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: "grade_distribution", label: "Grade Distribution" },
                { key: "performance_trends", label: "Performance Trends" },
                { key: "course_analysis", label: "Course Analysis" },
                { key: "department_comparison", label: "Department Comparison" },
              ].map((report) => (
                <Button
                  key={report.key}
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={() => handleExportAnalytics(report.key)}
                  disabled={exportAnalytics.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {report.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Separator />

      {/* Bulk Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Operations</CardTitle>
          <CardDescription>Perform operations on multiple records simultaneously</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex-col bg-transparent">
              <Download className="h-6 w-6 mb-2" />
              <span>Bulk Transcripts</span>
              <span className="text-xs text-muted-foreground">Export all student transcripts</span>
            </Button>

            <Button variant="outline" className="h-20 flex-col bg-transparent">
              <FileText className="h-6 w-6 mb-2" />
              <span>Class Reports</span>
              <span className="text-xs text-muted-foreground">Generate class-wise reports</span>
            </Button>

            <Button variant="outline" className="h-20 flex-col bg-transparent">
              <BarChart3 className="h-6 w-6 mb-2" />
              <span>Custom Analytics</span>
              <span className="text-xs text-muted-foreground">Create custom report templates</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
