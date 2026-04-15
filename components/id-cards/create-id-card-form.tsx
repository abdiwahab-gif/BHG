"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, CreditCard, Loader2, GraduationCap, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { useToast } from "@/hooks/use-toast"
import { useStudents } from "@/hooks/use-students"
import { useTeachers } from "@/hooks/use-teachers"
import { useCreateIDCard } from "@/hooks/use-id-cards"
import type { Student } from "@/lib/api/students"
import type { Teacher } from "@/lib/api/teachers"

const createIDCardSchema = z.object({
  type: z.enum(["student", "staff"], { required_error: "Please select card type" }),
  personId: z.string().min(1, "Please select a person"),
  department: z.string().min(1, "Please select department"),
  program: z.string().optional(),
  position: z.string().optional(),
  academicYear: z.string().optional(),
  validityPeriod: z.coerce.number().min(1).max(10).optional().default(4),
})

type CreateIDCardFormData = z.infer<typeof createIDCardSchema>

const departments = [
  "Computer Science",
  "Business Administration", 
  "Engineering",
  "Medicine",
  "Biology",
  "Chemistry",
  "Physics",
  "Mathematics",
  "English Literature",
  "Economics",
  "Psychology",
  "Education"
]

const programs = [
  "Bachelor of Computer Science",
  "Bachelor of Business Administration",
  "Bachelor of Engineering",
  "Bachelor of Medicine",
  "Bachelor of Science",
  "Master of Computer Science",
  "Master of Business Administration",
  "PhD in Computer Science"
]

const positions = [
  "Professor",
  "Associate Professor", 
  "Assistant Professor",
  "Lecturer",
  "Teaching Assistant",
  "Research Assistant",
  "Lab Technician",
  "Administrative Staff",
  "Security Staff",
  "Maintenance Staff"
]

export function CreateIDCardForm() {
  const [selectedType, setSelectedType] = useState<"student" | "staff" | "">("")
  const { toast } = useToast()
  const studentsData = useStudents()
  const { data: teachersData } = useTeachers()
  const createIDCard = useCreateIDCard()

  const form = useForm<CreateIDCardFormData>({
    resolver: zodResolver(createIDCardSchema),
    defaultValues: {
      type: undefined,
      personId: "",
      department: "",
      program: "",
      position: "",
      academicYear: "2024-2025",
      validityPeriod: 4,
    },
  })

  const handleTypeChange = (type: "student" | "staff") => {
    setSelectedType(type)
    form.setValue("type", type)
    form.setValue("personId", "") // Reset person selection
    form.setValue("validityPeriod", type === "student" ? 4 : 5)
  }

  const onSubmit = async (data: CreateIDCardFormData) => {
    try {
      let photoUrl = ""
      if (data.type === "student" && studentsData?.students) {
        const student = studentsData.students.find((s: Student) => s.id === data.personId)
        photoUrl = student?.photo || ""
      } else if (data.type === "staff" && teachersData?.teachers) {
        const teacher = teachersData.teachers.find((t: Teacher) => t.id === data.personId)
        photoUrl = teacher?.photo || ""
      }
      await createIDCard.mutateAsync({ ...data, photo: photoUrl })

      toast({
        title: "Success",
        description: "ID card created successfully!",
      })

      // Reset form
      form.reset()
      setSelectedType("")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create ID card",
        variant: "destructive",
      })
    }
  }

  const getPersonsList = () => {
    if (selectedType === "student") {
      // studentsData has the structure { students: [...], pagination: {...} }
      return studentsData?.students?.map((student: Student) => ({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        info: `${student.class} - ${student.section}`
      })) || []
    } else if (selectedType === "staff") {
      // teachersData has the structure { teachers: [...], pagination: {...} }
      return teachersData?.teachers?.map((teacher: Teacher) => ({
        id: teacher.id,
        name: `${teacher.firstName} ${teacher.lastName}`,
        info: teacher.subjects?.join(", ") || "No Subjects"
      })) || []
    }
    return []
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>Create New ID Card</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Type</FormLabel>
                    <Select
                      onValueChange={handleTypeChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select card type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="student">
                          <div className="flex items-center space-x-2">
                            <GraduationCap className="h-4 w-4" />
                            <span>Student Card</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="staff">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4" />
                            <span>Staff Card</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Person Selection */}
              <FormField
                control={form.control}
                name="personId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {selectedType === "student" ? "Select Student" : "Select Staff Member"}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedType}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue 
                            placeholder={
                              !selectedType 
                                ? "First select card type" 
                                : `Choose a ${selectedType}`
                            } 
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getPersonsList().map((person: { id: string; name: string; info: string }) => (
                          <SelectItem key={person.id} value={person.id}>
                            <div>
                              <div className="font-medium">{person.name}</div>
                              <div className="text-xs text-gray-500">{person.info}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Department */}
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Program (for students) */}
              {selectedType === "student" && (
                <FormField
                  control={form.control}
                  name="program"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select program" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {programs.map((program) => (
                            <SelectItem key={program} value={program}>
                              {program}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Position (for staff) */}
              {selectedType === "staff" && (
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select position" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {positions.map((position) => (
                            <SelectItem key={position} value={position}>
                              {position}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Academic Year (for students) */}
              {selectedType === "student" && (
                <FormField
                  control={form.control}
                  name="academicYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic Year</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select academic year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="2024-2025">2024-2025</SelectItem>
                          <SelectItem value="2025-2026">2025-2026</SelectItem>
                          <SelectItem value="2026-2027">2026-2027</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Validity Period */}
              <FormField
                control={form.control}
                name="validityPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validity (Years)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select validity period" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 Year</SelectItem>
                        <SelectItem value="2">2 Years</SelectItem>
                        <SelectItem value="3">3 Years</SelectItem>
                        <SelectItem value="4">4 Years</SelectItem>
                        <SelectItem value="5">5 Years</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={createIDCard.isPending}
            >
              {createIDCard.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating ID Card...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Create ID Card
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}