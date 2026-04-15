"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { 
  UserCheck, 
  Users, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Save,
  Loader2,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useClasses } from "@/hooks/use-classes"
import { useStudentsForAttendance, useRecordAttendance } from "@/hooks/use-attendance"
import type { StudentAttendance } from "@/types/attendance"

const attendanceSchema = z.object({
  classId: z.string().min(1, "Please select a class"),
  courseId: z.string().min(1, "Please select a course"),
  date: z.string().min(1, "Please select a date"),
  notes: z.string().optional(),
})

type AttendanceFormData = z.infer<typeof attendanceSchema>

export function TakeAttendanceForm() {
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [availableCourses, setAvailableCourses] = useState<Array<{id: string, name: string}>>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(false)
  const [students, setStudents] = useState<StudentAttendance[]>([])
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
  })
  
  const { toast } = useToast()
  const { data: classesData, isLoading: isLoadingClasses } = useClasses()
  const { data: studentsData, isLoading: isLoadingStudents } = useStudentsForAttendance(selectedClass)
  const recordAttendance = useRecordAttendance()

  const form = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      classId: "",
      courseId: "",
      date: new Date().toISOString().split('T')[0], // Today's date
      notes: "",
    },
  })

  // Update students when studentsData changes
  useEffect(() => {
    if (studentsData?.students) {
      setStudents(studentsData.students)
      calculateStats(studentsData.students)
    }
  }, [studentsData])

  // Calculate attendance statistics
  const calculateStats = (studentList: StudentAttendance[]) => {
    const stats = {
      present: studentList.filter(s => s.status === "present").length,
      absent: studentList.filter(s => s.status === "absent").length,
      late: studentList.filter(s => s.status === "late").length,
    }
    setAttendanceStats(stats)
  }

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId)
    form.setValue("classId", classId)
    form.setValue("courseId", "") // Reset course selection

    // Load courses for the selected class (DB-backed)
    setAvailableCourses([])
    if (!classId) return

    const load = async () => {
      setIsLoadingCourses(true)
      try {
        const res = await fetch(`/api/classes/${classId}/courses`)
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.message || body?.error || "Failed to fetch class courses")

        const list = Array.isArray(body?.data) ? body.data : []
        const mapped = list.map((c: any) => ({ id: String(c.id), name: String(c.name) }))

        // If no class-specific courses are assigned yet, fall back to the global course catalog
        if (mapped.length === 0) {
          const allRes = await fetch("/api/courses")
          const allBody = await allRes.json().catch(() => null)
          if (allRes.ok) {
            const all = Array.isArray(allBody?.data) ? allBody.data : Array.isArray(allBody?.data?.data) ? allBody.data.data : []
            const allMapped = (all || []).map((c: any) => ({ id: String(c.id), name: String(c.name) }))
            setAvailableCourses(allMapped)
          } else {
            setAvailableCourses([])
          }
        } else {
          setAvailableCourses(mapped)
        }
      } catch (e: any) {
        setAvailableCourses([])
        toast({
          title: "Error",
          description: e?.message || "Failed to load courses",
          variant: "destructive",
        })
      } finally {
        setIsLoadingCourses(false)
      }
    }

    void load()
  }

  const handleStudentStatusChange = (studentId: string, status: "present" | "absent" | "late") => {
    const updatedStudents = students.map(student =>
      student.studentId === studentId
        ? { ...student, status }
        : student
    )
    setStudents(updatedStudents)
    calculateStats(updatedStudents)
  }

  const handleStudentNotesChange = (studentId: string, notes: string) => {
    const updatedStudents = students.map(student =>
      student.studentId === studentId
        ? { ...student, notes }
        : student
    )
    setStudents(updatedStudents)
  }

  const markAllPresent = () => {
    const updatedStudents = students.map(student => ({
      ...student,
      status: "present" as const
    }))
    setStudents(updatedStudents)
    calculateStats(updatedStudents)
  }

  const markAllAbsent = () => {
    const updatedStudents = students.map(student => ({
      ...student,
      status: "absent" as const
    }))
    setStudents(updatedStudents)
    calculateStats(updatedStudents)
  }

  const onSubmit = async (data: AttendanceFormData) => {
    if (students.length === 0) {
      toast({
        title: "No Students",
        description: "Please select a class with students to take attendance.",
        variant: "destructive",
      })
      return
    }

    try {
      await recordAttendance.mutateAsync({
        classId: data.classId,
        courseId: data.courseId,
        date: data.date,
        students,
        notes: data.notes,
      })

      toast({
        title: "Success",
        description: `Attendance recorded for ${attendanceStats.present + attendanceStats.absent + attendanceStats.late} students!`,
      })

      // Reset form but keep class and course selection
      setStudents([])
      form.setValue("date", new Date().toISOString().split('T')[0])
      form.setValue("notes", "")
      
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record attendance",
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserCheck className="h-5 w-5" />
          <span>Take Attendance</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Class Selection */}
            <FormField
              control={form.control}
              name="classId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Class</FormLabel>
                  <Select
                    onValueChange={handleClassChange}
                    value={field.value}
                    disabled={isLoadingClasses}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classesData?.map((classItem: any) => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          {classItem.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Course Selection */}
            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Course</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedClass || isLoadingCourses || availableCourses.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue 
                          placeholder={
                            !selectedClass 
                              ? "First select a class" 
                              : isLoadingCourses
                                ? "Loading courses..."
                              : availableCourses.length === 0 
                                ? "No courses available"
                                : "Choose a course"
                          } 
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableCourses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Selection */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Students List */}
            {isLoadingStudents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading students...</span>
              </div>
            ) : students.length > 0 ? (
              <div className="space-y-4">
                {/* Stats and Quick Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline" className="text-amber-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Present: {attendanceStats.present}
                    </Badge>
                    <Badge variant="outline" className="text-red-600">
                      <XCircle className="w-3 h-3 mr-1" />
                      Absent: {attendanceStats.absent}
                    </Badge>
                    <Badge variant="outline" className="text-yellow-600">
                      <Clock className="w-3 h-3 mr-1" />
                      Late: {attendanceStats.late}
                    </Badge>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={markAllPresent}
                    >
                      All Present
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={markAllAbsent}
                    >
                      All Absent
                    </Button>
                  </div>
                </div>

                {/* Students List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {students.map((student) => (
                    <div
                      key={student.studentId}
                      className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-500">
                          {student.rollNumber}
                        </span>
                        <span className="font-medium">
                          {student.studentName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant={student.status === "present" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleStudentStatusChange(student.studentId, "present")}
                          className="text-xs"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Present
                        </Button>
                        <Button
                          type="button"
                          variant={student.status === "absent" ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => handleStudentStatusChange(student.studentId, "absent")}
                          className="text-xs"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Absent
                        </Button>
                        <Button
                          type="button"
                          variant={student.status === "late" ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => handleStudentStatusChange(student.studentId, "late")}
                          className="text-xs"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          Late
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedClass ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <AlertCircle className="w-6 h-6 mr-2" />
                <span>No students found for this class</span>
              </div>
            ) : null}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about today's attendance..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={recordAttendance.isPending || students.length === 0}
            >
              {recordAttendance.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Record Attendance ({attendanceStats.present + attendanceStats.absent + attendanceStats.late} students)
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}