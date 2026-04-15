"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useCreateExamResult, useExamTypes } from "@/hooks/use-exam-results"
import { type Course, useCourses } from "@/hooks/use-courses"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

const examResultSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  courseId: z.string().min(1, "Course is required"),
  examTypeId: z.string().min(1, "Exam type is required"),
  score: z.number().min(0, "Score must be non-negative"),
  maxScore: z.number().min(1, "Max score must be positive"),
  comments: z.string().optional(),
})

type ExamResultFormData = z.infer<typeof examResultSchema>

interface AddExamResultFormProps {
  sessionId: string
  semesterId: string
  onSuccess?: () => void
  onCancel?: () => void
}

type StudentItem = {
  id: string
  firstName: string
  lastName: string
  studentId: string
  gender?: string
}

export function AddExamResultForm({ sessionId, semesterId, onSuccess, onCancel }: AddExamResultFormProps) {
  const { toast } = useToast()
  const createExamResult = useCreateExamResult()

  const [studentSearchInput, setStudentSearchInput] = useState("")
  const [studentSearchTerm, setStudentSearchTerm] = useState("")
  const [courseSearchInput, setCourseSearchInput] = useState("")
  const [courseSearchTerm, setCourseSearchTerm] = useState("")

  const { data: courses = [], isLoading: isLoadingCourses } = useCourses({ search: courseSearchTerm, limit: 50 })
  const { data: examTypesResp, isLoading: isLoadingExamTypes } = useExamTypes()
  const examTypes = Array.isArray(examTypesResp?.data) ? examTypesResp.data : []

  const { data: studentsResponse, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["students", "select", studentSearchTerm],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set("limit", "50")
      if (studentSearchTerm.trim()) params.set("search", studentSearchTerm.trim())

      const res = await fetch(`/api/students?${params.toString()}`)
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.message || body?.error || "Failed to fetch students")
      return body
    },
    staleTime: 2 * 60 * 1000,
  })

  const students = Array.isArray(studentsResponse?.students) ? (studentsResponse.students as StudentItem[]) : []

  const form = useForm<ExamResultFormData>({
    resolver: zodResolver(examResultSchema),
    defaultValues: {
      studentId: "",
      courseId: "",
      score: 0,
      maxScore: 100,
      comments: "",
    },
  })

  const selectedStudentId = form.watch("studentId")
  const selectedCourseId = form.watch("courseId")

  const [studentCache, setStudentCache] = useState<Record<string, StudentItem>>({})
  const [courseCache, setCourseCache] = useState<Record<string, Course>>({})

  useEffect(() => {
    if (!students.length) return
    setStudentCache((prev) => {
      const next = { ...prev }
      for (const s of students) next[s.id] = s
      return next
    })
  }, [students])

  useEffect(() => {
    if (!courses.length) return
    setCourseCache((prev) => {
      const next = { ...prev }
      for (const c of courses) next[c.id] = c
      return next
    })
  }, [courses])

  const studentOptions = useMemo(() => {
    if (!selectedStudentId) return students
    if (students.some((s) => s.id === selectedStudentId)) return students
    const cached = studentCache[selectedStudentId]
    return cached ? [...students, cached] : students
  }, [students, selectedStudentId, studentCache])

  const courseOptions = useMemo(() => {
    if (!selectedCourseId) return courses
    if (courses.some((c) => c.id === selectedCourseId)) return courses
    const cached = courseCache[selectedCourseId]
    return cached ? [...courses, cached] : courses
  }, [courses, selectedCourseId, courseCache])

  const selectedStudent = studentCache[selectedStudentId]
  const selectedCourse = courseCache[selectedCourseId]

  const onSubmit = async (data: ExamResultFormData) => {
    try {
      await createExamResult.mutateAsync({
        studentId: data.studentId,
        courseId: data.courseId,
        examTypeId: data.examTypeId,
        sessionId,
        semesterId,
        score: data.score,
        maxScore: data.maxScore,
        comments: data.comments,
      })
      toast({
        title: "Success",
        description: "Exam result added successfully",
      })
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add exam result",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Add Exam Result</CardTitle>
        <CardDescription>Enter student exam results with validation and real-time feedback</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student</FormLabel>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Search student ID or name"
                        value={studentSearchInput}
                        onChange={(e) => setStudentSearchInput(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStudentSearchTerm(studentSearchInput)}
                      >
                        Search
                      </Button>
                    </div>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingStudents ? "Loading..." : "Select student"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {studentOptions.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No students found</div>
                        ) : (
                          studentOptions.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.firstName} {s.lastName} ({s.studentId})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course</FormLabel>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Search course name or code"
                        value={courseSearchInput}
                        onChange={(e) => setCourseSearchInput(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCourseSearchTerm(courseSearchInput)}
                      >
                        Search
                      </Button>
                    </div>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full whitespace-normal h-auto min-h-9 items-start">
                          <SelectValue
                            placeholder="Select course"
                            className="line-clamp-none whitespace-normal break-words"
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingCourses ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                        ) : courseOptions.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No courses found</div>
                        ) : (
                          courseOptions.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="whitespace-normal items-start">
                              <div className="flex flex-col gap-0.5">
                                <div className="font-medium break-words">
                                  {c.code ? `${c.code} — ` : ""}
                                  {c.name}
                                </div>
                                <div className="text-xs text-muted-foreground break-words">
                                  {c.credits === null || c.credits === undefined ? "" : `${c.credits} credits`}
                                  {c.faculty ? ` • ${c.faculty}` : ""}
                                  {c.department ? ` • ${c.department}` : ""}
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="examTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select exam type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingExamTypes ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
                        ) : examTypes.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No exam types found</div>
                        ) : (
                          examTypes.map((t: any) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Student Gender</div>
                <Input value={selectedStudent?.gender ? String(selectedStudent.gender) : ""} disabled />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Course Code</div>
                <Input value={selectedCourse?.code ? String(selectedCourse.code) : ""} disabled />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Course Credits</div>
                <Input
                  value={
                    selectedCourse?.credits === null || selectedCourse?.credits === undefined
                      ? ""
                      : String(selectedCourse.credits)
                  }
                  disabled
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Faculty</div>
                <Input value={selectedCourse?.faculty ? String(selectedCourse.faculty) : ""} disabled />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Department</div>
                <Input value={selectedCourse?.department ? String(selectedCourse.department) : ""} disabled />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter score"
                        {...field}
                        onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Score</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter max score"
                        {...field}
                        onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comments (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter any additional comments" className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={createExamResult.isPending}>
                {createExamResult.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Result
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
