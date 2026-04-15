"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, TrendingUp, User } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useStudentPerformance } from "@/hooks/use-analytics"
import { useQuery } from "@tanstack/react-query"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"

interface StudentPerformanceDashboardProps {
  sessionId: string
  semesterId: string
}

type StudentListItem = {
  id: string
  firstName: string
  lastName: string
  studentId: string
  className?: string
}

async function fetchStudents(search: string): Promise<StudentListItem[]> {
  const params = new URLSearchParams({ limit: "50" })
  if (search.trim()) params.set("search", search.trim())
  const res = await fetch(`/api/students?${params.toString()}`)
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.message || body?.error || "Failed to fetch students")
  return Array.isArray(body?.students) ? (body.students as StudentListItem[]) : []
}

function letterFromGpa(gpa: number): string {
  if (gpa >= 3.75) return "A"
  if (gpa >= 3.5) return "A-"
  if (gpa >= 3.0) return "B"
  if (gpa >= 2.5) return "C+"
  if (gpa >= 2.0) return "C"
  return "F"
}

export function StudentPerformanceDashboard({ sessionId, semesterId }: StudentPerformanceDashboardProps) {
  const [selectedStudent, setSelectedStudent] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ["students", "student-performance", searchQuery],
    queryFn: () => fetchStudents(searchQuery),
    staleTime: 2 * 60 * 1000,
  })

  const { data: studentData, isLoading } = useStudentPerformance({
    studentId: selectedStudent,
    sessionId,
    semesterId,
  })

  const perf = studentData?.data
  const coursePerformance = Array.isArray(perf?.coursePerformance) ? perf.coursePerformance : []
  const semesterGPAs = Array.isArray(perf?.semesterGPAs) ? perf.semesterGPAs : []
  const currentGPA = Number(perf?.currentGPA || 0)
  const avgAttendance =
    coursePerformance.length > 0
      ? Math.round(
          coursePerformance.reduce((sum: number, c: any) => sum + Number(c.attendance || 0), 0) / coursePerformance.length,
        )
      : 0
  const averageGrade = letterFromGpa(currentGPA)

  const courseBarData = coursePerformance.map((c: any) => ({
    course: String(c.courseCode || "").slice(0, 8),
    grade: Number(c.gradePoint || 0),
    credits: Number(c.credits || 0),
  }))

  const radarData = (() => {
    const byExamType = new Map<string, { sumPct: number; count: number }>()
    for (const c of coursePerformance) {
      const exams = Array.isArray((c as any).examResults) ? (c as any).examResults : []
      for (const ex of exams) {
        const examType = String(ex.examType || "")
        if (!examType) continue
        const score = Number(ex.score || 0)
        const maxScore = Number(ex.maxScore || 0)
        const pct = maxScore > 0 ? (score / maxScore) * 100 : 0
        const cur = byExamType.get(examType) || { sumPct: 0, count: 0 }
        cur.sumPct += pct
        cur.count += 1
        byExamType.set(examType, cur)
      }
    }

    return [...byExamType.entries()]
      .map(([skill, v]) => ({ skill, score: v.count ? Math.round((v.sumPct / v.count) * 10) / 10 : 0 }))
      .slice(0, 6)
  })()

  if (isLoading && selectedStudent) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-muted rounded w-1/3"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Student Search and Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Student Performance Analysis
          </CardTitle>
          <CardDescription>Search and analyze individual student performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students by name or program..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingStudents ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                ) : students.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No students found</div>
                ) : (
                  students.map((student) => {
                    const name = `${student.firstName} ${student.lastName}`.trim()
                    const program = student.className || ""
                    return (
                      <SelectItem key={student.id} value={student.id}>
                        <div className="flex items-center gap-2">
                          <span>{name}</span>
                          {program ? (
                            <Badge variant="outline" className="text-xs">
                              {program}
                            </Badge>
                          ) : null}
                        </div>
                      </SelectItem>
                    )
                  })
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedStudent ? (
        <div className="space-y-6">
          {/* Student Overview */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>Student Overview</CardTitle>
                <CardDescription>
                  {perf?.student?.name || ""} {perf?.student?.program ? `- ${perf.student.program}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{currentGPA.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Current GPA</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-amber-600">{avgAttendance}%</div>
                    <div className="text-sm text-muted-foreground">Attendance Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{coursePerformance.length}</div>
                    <div className="text-sm text-muted-foreground">Courses Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">{averageGrade}</div>
                    <div className="text-sm text-muted-foreground">Average Grade</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GPA Trend */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    GPA Trend
                  </CardTitle>
                  <CardDescription>Semester-wise GPA progression</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={semesterGPAs.map((s: any) => ({ semester: s.semester, gpa: Number(s.gpa || 0) }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="semester" />
                      <YAxis domain={[0, 4]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="gpa" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Course Performance */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Course Performance</CardTitle>
                  <CardDescription>Current semester course grades</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={courseBarData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="course" />
                      <YAxis domain={[0, 4]} />
                      <Tooltip />
                      <Bar dataKey="grade" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Skills Radar Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader>
                <CardTitle>Skills Assessment</CardTitle>
                <CardDescription>Performance across different skill areas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Score" dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Detailed Course List */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardHeader>
                <CardTitle>Course Details</CardTitle>
                <CardDescription>Detailed breakdown of all courses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {coursePerformance.map((course: any, idx: number) => (
                    <div
                      key={`${course.courseId || course.courseCode || course.courseName || "course"}-${idx}`}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <h4 className="font-medium">{String(course.courseCode || "").slice(0, 8)}</h4>
                            <p className="text-sm text-muted-foreground">{course.courseName}</p>
                          </div>
                          <Badge variant="outline">{Number(course.credits || 0)} credits</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-lg font-bold">{course.finalGrade || "-"}</div>
                          <div className="text-xs text-muted-foreground">Grade</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold">{Number(course.gradePoint || 0).toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">GPA</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-amber-600">{Number(course.attendance || 0)}%</div>
                          <div className="text-xs text-muted-foreground">Attendance</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Student</h3>
            <p className="text-muted-foreground">
              Choose a student from the dropdown above to view their performance analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
