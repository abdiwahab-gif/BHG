"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, Filter, Download, Eye, Edit, MoreHorizontal } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useExamResults } from "@/hooks/use-exam-results"
import { useCourses } from "@/hooks/use-courses"
import { useFaculties } from "@/hooks/use-faculties"

interface ExamResultsTableProps {
  sessionId: string
  semesterId: string
  onNavigateScope?: (sessionId: string, semesterId: string) => void
}

export function ExamResultsTable({ sessionId, semesterId, onNavigateScope }: ExamResultsTableProps) {
  const [searchInput, setSearchInput] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [gradeFilter, setGradeFilter] = useState("all")
  const [facultyFilter, setFacultyFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [courseFilter, setCourseFilter] = useState("all")
  const [studentFilter, setStudentFilter] = useState("all")
  const [courseSearchInput, setCourseSearchInput] = useState("")
  const [courseSearchTerm, setCourseSearchTerm] = useState("")
  const [studentSearchInput, setStudentSearchInput] = useState("")
  const [studentSearchTerm, setStudentSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const { data: faculties, isLoading: isLoadingFaculties } = useFaculties()
  const { data: courses, isLoading: isLoadingCourses } = useCourses()
  const { data: studentsResponse, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["students", "select", studentSearchTerm],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set("limit", "50")
      if (studentSearchTerm.trim()) params.set("search", studentSearchTerm.trim())

      const res = await fetch(`/api/students?${params.toString()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || body?.error || "Failed to fetch students")
      }
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  const allCourses = Array.isArray(courses) ? courses : []
  const filteredCourses = allCourses.filter((c) => {
    const matchesFaculty = facultyFilter === "all" ? true : String(c.faculty || "") === facultyFilter
    const matchesDepartment = departmentFilter === "all" ? true : String(c.department || "") === departmentFilter
    return matchesFaculty && matchesDepartment
  })

  const coursesToShow = courseSearchTerm.trim()
    ? filteredCourses.filter((c) => {
        const q = courseSearchTerm.trim().toLowerCase()
        return (
          String(c.name || "").toLowerCase().includes(q) ||
          String(c.code || "").toLowerCase().includes(q) ||
          String(c.id || "").toLowerCase().includes(q)
        )
      })
    : filteredCourses

  const departmentOptions = Array.from(
    new Set(
      allCourses
        .filter((c) => (facultyFilter === "all" ? true : String(c.faculty || "") === facultyFilter))
        .map((c) => String(c.department || "").trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b))

  const studentOptions = Array.isArray(studentsResponse?.students) ? studentsResponse.students : []

  const { data: examResults, isLoading } = useExamResults({
    sessionId,
    semesterId,
    faculty: facultyFilter === "all" ? undefined : facultyFilter,
    department: departmentFilter === "all" ? undefined : departmentFilter,
    courseId: courseFilter === "all" ? undefined : courseFilter,
    studentId: studentFilter === "all" ? undefined : studentFilter,
    search: appliedSearch.trim() ? appliedSearch.trim() : undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    grade: gradeFilter === "all" ? undefined : gradeFilter,
    page: currentPage,
    limit: 20,
  })

  const results = Array.isArray(examResults?.data) ? examResults.data : []
  const pagination = examResults?.pagination

  const locateAndNavigateForStudent = async (studentUuid: string) => {
    if (!onNavigateScope) return
    const id = String(studentUuid || "").trim()
    if (!id || id === "all") return

    const params = new URLSearchParams({ studentId: id, limit: "1" })
    const res = await fetch(`/api/exam-results?${params.toString()}`)
    if (!res.ok) return

    const json = await res.json().catch(() => null)
    const first = Array.isArray(json?.data) ? json.data[0] : null
    if (!first?.sessionId || !first?.semesterId) return

    const targetSessionId = String(first.sessionId)
    const targetSemesterId = String(first.semesterId)
    if (targetSessionId === sessionId && targetSemesterId === semesterId) return
    onNavigateScope(targetSessionId, targetSemesterId)
  }

  const downloadReport = async () => {
    const params = new URLSearchParams({ format: "csv" })
    if (String(sessionId || "").trim()) params.set("sessionId", String(sessionId))
    if (String(semesterId || "").trim()) params.set("semesterId", String(semesterId))

    const res = await fetch(`/api/exam-results/report?${params.toString()}`)
    if (!res.ok) return

    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `exam-results-${sessionId}-${semesterId}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Published</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Draft</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getGradeBadge = (grade: string, gpa: number) => {
    const getGradeColor = (gpa: number) => {
      if (gpa >= 4.0) return "bg-amber-100 text-amber-800 hover:bg-amber-100"
      if (gpa >= 3.0) return "bg-blue-100 text-blue-800 hover:bg-blue-100"
      if (gpa >= 2.0) return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      if (gpa >= 1.0) return "bg-orange-100 text-orange-800 hover:bg-orange-100"
      return "bg-red-100 text-red-800 hover:bg-red-100"
    }

    return <Badge className={getGradeColor(gpa)}>{grade}</Badge>
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Results</CardTitle>
          <CardDescription>View and manage all exam results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select
                value={facultyFilter}
                onValueChange={(val) => {
                  setFacultyFilter(val)
                  setDepartmentFilter("all")
                  setCourseFilter("all")
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Faculties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Faculties</SelectItem>
                  {isLoadingFaculties ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                  ) : Array.isArray(faculties) && faculties.length > 0 ? (
                    faculties
                      .map((f) => String(f.name || "").trim())
                      .filter(Boolean)
                      .sort((a, b) => a.localeCompare(b))
                      .map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No faculties found</div>
                  )}
                </SelectContent>
              </Select>

              <Select
                value={departmentFilter}
                onValueChange={(val) => {
                  setDepartmentFilter(val)
                  setCourseFilter("all")
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {isLoadingCourses ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                  ) : departmentOptions.length > 0 ? (
                    departmentOptions.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No departments found</div>
                  )}
                </SelectContent>
              </Select>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Course name/code"
                    value={courseSearchInput}
                    onChange={(e) => setCourseSearchInput(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCourseSearchTerm(courseSearchInput)
                      setCourseFilter("all")
                      setCurrentPage(1)
                    }}
                  >
                    Search
                  </Button>
                </div>

                <Select
                  value={courseFilter}
                  onValueChange={(val) => {
                    setCourseFilter(val)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {isLoadingCourses ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                    ) : coursesToShow.length > 0 ? (
                      coursesToShow
                        .slice()
                        .sort((a, b) => String(a.code || a.name || "").localeCompare(String(b.code || b.name || "")))
                        .map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.code ? `${course.code} — ${course.name}` : course.name}
                          </SelectItem>
                        ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No courses found</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Student ID/name"
                    value={studentSearchInput}
                    onChange={(e) => setStudentSearchInput(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStudentSearchTerm(studentSearchInput)
                      setStudentFilter("all")
                      setCurrentPage(1)
                    }}
                  >
                    Search
                  </Button>
                </div>

                <Select
                  value={studentFilter}
                  onValueChange={(val) => {
                    setStudentFilter(val)
                    setCurrentPage(1)
                    void locateAndNavigateForStudent(val)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Students" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    {isLoadingStudents ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                    ) : studentOptions.length > 0 ? (
                      studentOptions.map((s: any) => (
                        <SelectItem key={String(s.id)} value={String(s.id)}>
                          {`${String(s.firstName || "").trim()} ${String(s.lastName || "").trim()}`.trim() ||
                            String(s.studentId || "Student")}
                          {s.studentId ? ` (${String(s.studentId)})` : ""}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No students found</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name, number, or course..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setAppliedSearch(searchInput)
                  setCurrentPage(1)
                }}
              >
                Search
              </Button>
            </div>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={gradeFilter}
                onValueChange={(val) => {
                  setGradeFilter(val)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                  <SelectItem value="F">F</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={downloadReport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Exam Type</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>GPA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Audit</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result: any) => (
                  <TableRow key={result.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{result.studentName}</div>
                        <div className="text-sm text-muted-foreground">{result.studentNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{result.courseCode || String(result.courseId || "").slice(0, 8)}</div>
                        <div className="text-sm text-muted-foreground">{result.courseName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{result.examTypeName}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-lg font-bold">{Number(result.percentage || 0).toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">
                        {Number(result.score || 0)} / {Number(result.maxScore || 0)}
                      </div>
                    </TableCell>
                    <TableCell>{getGradeBadge(result.letterGrade, Number(result.gradePoint || 0))}</TableCell>
                    <TableCell>
                      <div className="font-medium">{Number(result.gradePoint || 0).toFixed(2)}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(result.isPublished ? "published" : "pending")}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>
                          <span className="text-muted-foreground">Entered:</span> {result.enteredBy || "-"}
                        </div>
                        <div className="text-muted-foreground">
                          {result.enteredAt ? new Date(result.enteredAt).toLocaleString() : "-"}
                        </div>
                        {result.modifiedAt || result.modifiedBy ? (
                          <div className="mt-1">
                            <div>
                              <span className="text-muted-foreground">Modified:</span> {result.modifiedBy || "-"}
                            </div>
                            <div className="text-muted-foreground">
                              {result.modifiedAt ? new Date(result.modifiedAt).toLocaleString() : "-"}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Result
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {results.length} of {Number(pagination?.total || results.length)} results
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={Boolean(pagination?.totalPages) ? currentPage >= Number(pagination?.totalPages || 1) : results.length < 20}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
