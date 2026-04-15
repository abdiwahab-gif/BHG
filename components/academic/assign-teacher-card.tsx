"use client"

import { useEffect, useState } from "react"
import { UserCheck, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

type TeacherItem = {
  id: string
  firstName: string
  lastName: string
  subjects?: string[]
}

type CourseItem = {
  id: string
  name: string
  type: string
}

export function AssignTeacherCard() {
  const [selectedTeacher, setSelectedTeacher] = useState("")
  const [selectedCourse, setSelectedCourse] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [teachers, setTeachers] = useState<TeacherItem[]>([])
  const [courses, setCourses] = useState<CourseItem[]>([])
  const { toast } = useToast()

  const loadTeachers = async () => {
    const res = await fetch("/api/teachers?limit=100")
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.error || "Failed to fetch teachers")

    const list = Array.isArray(data?.teachers) ? data.teachers : []
    setTeachers(list)
  }

  const loadCourses = async () => {
    const res = await fetch("/api/courses")
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.message || "Failed to fetch courses")

    const list = Array.isArray(data?.data) ? data.data : []
    setCourses(list)
  }

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsFetching(true)
      try {
        await Promise.all([loadTeachers(), loadCourses()])
      } catch (error) {
        if (!isMounted) return
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load teachers/courses",
          variant: "destructive",
        })
      } finally {
        if (isMounted) setIsFetching(false)
      }
    }

    const onCoursesChanged = () => {
      loadCourses().catch(() => null)
    }

    load()
    window.addEventListener("courses:changed", onCoursesChanged)

    return () => {
      isMounted = false
      window.removeEventListener("courses:changed", onCoursesChanged)
    }
  }, [toast])

  const handleAssignTeacher = async () => {
    if (!selectedTeacher || !selectedCourse) {
      toast({
        title: "Error",
        description: "Please select both teacher and course",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const teacher = teachers.find((t) => t.id === selectedTeacher)
      const course = courses.find((c) => c.id === selectedCourse)

      const res = await fetch("/api/course-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: selectedTeacher, courseId: selectedCourse }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        toast({
          title: "Error",
          description: data?.message || "Failed to assign teacher",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: `${teacher ? `${teacher.firstName} ${teacher.lastName}` : "Teacher"} assigned to ${course?.name || "course"}`,
      })
      setSelectedTeacher("")
      setSelectedCourse("")
      window.dispatchEvent(new Event("courseAssignments:changed"))
    } catch {
      toast({
        title: "Error",
        description: "Failed to assign teacher",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-sans">Assign Teacher</CardTitle>
        </div>
        <CardDescription>Assign teachers to courses</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="teacher-select" className="text-sm font-medium">
            Select Teacher
          </Label>
          <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Choose teacher" />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{teacher.firstName} {teacher.lastName}</span>
                    <span className="text-xs text-muted-foreground">{teacher.subjects?.[0] || ""}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="course-select" className="text-sm font-medium">
            Assign to Course
          </Label>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Choose course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{course.name}</span>
                    <span className="text-xs text-muted-foreground">{course.type}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleAssignTeacher}
          disabled={isLoading || isFetching}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isFetching ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Loading...
            </div>
          ) : isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Assigning...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assign
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
