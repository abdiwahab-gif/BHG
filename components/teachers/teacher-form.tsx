"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Upload, User, Mail, Phone, MapPin, Globe, Calendar, DollarSign, BookOpen, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useCreateTeacher, useUpdateTeacher } from "@/hooks/use-teachers"
import { useRouter } from "next/navigation"

const teacherFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  gender: z.enum(["Male", "Female"], { required_error: "Please select a gender" }),
  nationality: z.string().min(2, "Nationality is required"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  address2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  zip: z.string().min(3, "ZIP code is required"),
  photo: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  qualifications: z.array(z.string()).optional(),
  experience: z.string().optional(),
  joiningDate: z.string().optional(),
  salary: z.number().min(0, "Salary must be a positive number").optional(),
})

type TeacherFormData = z.infer<typeof teacherFormSchema>

interface TeacherFormProps {
  initialData?: Partial<TeacherFormData>
  isEditing?: boolean
  teacherId?: string
}

export function TeacherForm({ initialData, isEditing = false, teacherId }: TeacherFormProps) {
  const [photoPreview, setPhotoPreview] = useState<string>(initialData?.photo || "")
  const [subjectsInput, setSubjectsInput] = useState("")
  const [qualificationsInput, setQualificationsInput] = useState("")
  const router = useRouter()

  const createTeacherMutation = useCreateTeacher()
  const updateTeacherMutation = useUpdateTeacher()

  const form = useForm<TeacherFormData>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      gender: initialData?.gender || undefined,
      nationality: initialData?.nationality || "",
      address: initialData?.address || "",
      address2: initialData?.address2 || "",
      city: initialData?.city || "",
      zip: initialData?.zip || "",
      photo: initialData?.photo || "",
      subjects: initialData?.subjects || [],
      qualifications: initialData?.qualifications || [],
      experience: initialData?.experience || "",
      joiningDate: initialData?.joiningDate || "",
      salary: initialData?.salary || 0,
    },
  })

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setPhotoPreview(result)
        form.setValue("photo", result)
      }
      reader.readAsDataURL(file)
    }
  }

  const addSubject = () => {
    if (subjectsInput.trim()) {
      const currentSubjects = form.getValues("subjects") || []
      const newSubjects = [...currentSubjects, subjectsInput.trim()]
      form.setValue("subjects", newSubjects)
      setSubjectsInput("")
    }
  }

  const removeSubject = (index: number) => {
    const currentSubjects = form.getValues("subjects") || []
    const newSubjects = currentSubjects.filter((_, i) => i !== index)
    form.setValue("subjects", newSubjects)
  }

  const addQualification = () => {
    if (qualificationsInput.trim()) {
      const currentQualifications = form.getValues("qualifications") || []
      const newQualifications = [...currentQualifications, qualificationsInput.trim()]
      form.setValue("qualifications", newQualifications)
      setQualificationsInput("")
    }
  }

  const removeQualification = (index: number) => {
    const currentQualifications = form.getValues("qualifications") || []
    const newQualifications = currentQualifications.filter((_, i) => i !== index)
    form.setValue("qualifications", newQualifications)
  }

  const onSubmit = async (data: TeacherFormData) => {
    try {
      if (isEditing && teacherId) {
        await updateTeacherMutation.mutateAsync({ id: teacherId, data })
        // Navigate to teacher profile after successful update
        router.push(`/teachers/${teacherId}`)
      } else {
        await createTeacherMutation.mutateAsync(data)
        // Navigate to teachers list page after successful creation
        router.push("/teachers")
      }
    } catch (error) {
      console.error("Error saving teacher:", error)
    }
  }

  const isSubmitting = isEditing ? updateTeacherMutation.isPending : createTeacherMutation.isPending

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto p-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-6 w-6" />
            {isEditing ? "Edit Teacher" : "Add New Teacher"}
          </CardTitle>
          <CardDescription>
            {isEditing ? "Update teacher information" : "Fill in the details to add a new teacher to the system"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Photo Upload Section */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center space-y-4"
              >
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted">
                    {photoPreview ? (
                      <img
                        src={photoPreview || "/placeholder.svg"}
                        alt="Teacher photo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute -bottom-2 -right-2 bg-transparent"
                    onClick={() => document.querySelector('input[type="file"]')?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">Click to upload teacher photo</p>
              </motion.div>

              {/* Personal Information */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter first name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email *
                        </FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone *
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nationality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Nationality *
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Enter nationality" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </motion.div>

              {/* Address Information */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter street address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address2"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address 2 (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Apartment, suite, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter city" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter ZIP code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </motion.div>

              {/* Professional Information */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Professional Information
                </h3>
                <div className="space-y-6">
                  {/* Subjects */}
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-4 w-4" />
                      Subjects
                    </Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Enter subject"
                        value={subjectsInput}
                        onChange={(e) => setSubjectsInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSubject())}
                      />
                      <Button type="button" onClick={addSubject} variant="outline">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.watch("subjects")?.map((subject, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                        >
                          {subject}
                          <button
                            type="button"
                            onClick={() => removeSubject(index)}
                            className="text-primary hover:text-primary/70"
                          >
                            ×
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Qualifications */}
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Award className="h-4 w-4" />
                      Qualifications
                    </Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Enter qualification"
                        value={qualificationsInput}
                        onChange={(e) => setQualificationsInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addQualification())}
                      />
                      <Button type="button" onClick={addQualification} variant="outline">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.watch("qualifications")?.map((qualification, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                        >
                          {qualification}
                          <button
                            type="button"
                            onClick={() => removeQualification(index)}
                            className="text-secondary hover:text-secondary/70"
                          >
                            ×
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Experience</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 5 years" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="joiningDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Joining Date
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="salary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Salary
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Enter salary"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Form Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex gap-4 pt-6"
              >
                <Button type="submit" className="flex items-center gap-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  {isEditing ? "Update Teacher" : "+ Add Teacher"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(isEditing ? `/teachers/${teacherId}` : "/teachers")}
                >
                  Cancel
                </Button>
              </motion.div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
