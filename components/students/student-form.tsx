"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, User, Users, FileText, Heart, GraduationCap, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useClasses } from "@/hooks/use-classes"
import Link from "next/link"

const baseStudentSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  photo: z.string().optional().or(z.literal("")),
  birthday: z.string().min(1, "Birthday is required"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  class: z.string().min(1, "Please select a class"),
  section: z.string().min(1, "Please select a section"),
  gender: z.enum(["male", "female", "other"]),
  bloodType: z.string().min(1, "Please select blood type"),
  nationality: z.string().min(2, "Nationality is required"),
  religion: z.string().min(1, "Religion is required"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  address2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  zip: z.string().min(3, "ZIP code is required"),
  idCardNumber: z.string().min(1, "ID card number is required"),
  boardRegistrationNo: z.string().optional(),
  fatherName: z.string().min(2, "Father's name is required"),
  motherName: z.string().min(2, "Mother's name is required"),
  fatherPhone: z.string().min(10, "Father's phone is required"),
  motherPhone: z.string().min(10, "Mother's phone is required"),
  fatherOccupation: z.string().optional(),
  motherOccupation: z.string().optional(),
  fatherEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  motherEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  emergencyContact: z.string().min(10, "Emergency contact is required"),
  medicalConditions: z.string().optional(),
  allergies: z.string().optional(),
  previousSchool: z.string().optional(),
  transferReason: z.string().optional(),
})

function getStudentSchema(isEditing: boolean) {
  return baseStudentSchema.extend({
    password: isEditing
      ? z
          .string()
          .refine((value) => value === "" || value.length >= 8, "Password must be at least 8 characters")
      : z.string().min(8, "Password must be at least 8 characters"),
  })
}

type StudentFormData = z.infer<typeof baseStudentSchema> & { password: string }

interface StudentFormProps {
  initialData?: Partial<
    StudentFormData & { photo?: string; id?: string; studentId?: string; status?: string; enrollmentDate?: string }
  >
  onSubmit: (data: StudentFormData) => Promise<void>
  onCancel?: () => void
  submitButtonText?: string
  isEditing?: boolean
}

export function StudentForm({
  initialData,
  onSubmit,
  onCancel,
  submitButtonText = "Add Student",
  isEditing = false,
}: StudentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("personal")
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photo || null)
  const { toast } = useToast()
  const { data: classesData, isLoading: isLoadingClasses } = useClasses()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(getStudentSchema(isEditing)),
    defaultValues: {
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      email: initialData?.email || "",
      password: initialData?.password || "",
      photo: initialData?.photo || "",
      birthday: initialData?.birthday || "",
      phone: initialData?.phone || "",
      class: initialData?.class || "",
      section: initialData?.section || "",
      gender: initialData?.gender || "male",
      bloodType: initialData?.bloodType || "",
      nationality: initialData?.nationality || "",
      religion: initialData?.religion || "",
      address: initialData?.address || "",
      address2: initialData?.address2 || "",
      city: initialData?.city || "",
      zip: initialData?.zip || "",
      idCardNumber: initialData?.idCardNumber || "",
      boardRegistrationNo: initialData?.boardRegistrationNo || "",
      fatherName: initialData?.fatherName || "",
      motherName: initialData?.motherName || "",
      fatherPhone: initialData?.fatherPhone || "",
      motherPhone: initialData?.motherPhone || "",
      fatherOccupation: initialData?.fatherOccupation || "",
      motherOccupation: initialData?.motherOccupation || "",
      fatherEmail: initialData?.fatherEmail || "",
      motherEmail: initialData?.motherEmail || "",
      emergencyContact: initialData?.emergencyContact || "",
      medicalConditions: initialData?.medicalConditions || "",
      allergies: initialData?.allergies || "",
      previousSchool: initialData?.previousSchool || "",
      transferReason: initialData?.transferReason || "",
    },
  })

  const handleFormSubmit = async (data: StudentFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      toast({
        title: "Success",
        description: `Student ${isEditing ? "updated" : "added"} successfully!`,
      })
    } catch (error) {
      console.error("Form submission error:", error)
      const message =
        error instanceof Error
          ? error.message
          : `Failed to ${isEditing ? "update" : "add"} student. Please try again.`
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInvalidSubmit = () => {
    const e = errors

    const hasAny = (keys: Array<keyof StudentFormData>) => keys.some((k) => Boolean((e as any)?.[k]))

    const personalKeys: Array<keyof StudentFormData> = [
      "firstName",
      "lastName",
      "email",
      "password",
      "birthday",
      "phone",
      "gender",
      "bloodType",
      "nationality",
      "religion",
      "address",
      "address2",
      "city",
      "zip",
      "idCardNumber",
    ]

    const academicKeys: Array<keyof StudentFormData> = ["class", "section", "boardRegistrationNo"]

    const parentsKeys: Array<keyof StudentFormData> = [
      "fatherName",
      "motherName",
      "fatherPhone",
      "motherPhone",
      "fatherOccupation",
      "motherOccupation",
      "fatherEmail",
      "motherEmail",
      "emergencyContact",
    ]

    const medicalKeys: Array<keyof StudentFormData> = ["medicalConditions", "allergies"]
    const otherKeys: Array<keyof StudentFormData> = ["previousSchool", "transferReason"]

    const nextTab = hasAny(academicKeys)
      ? "academic"
      : hasAny(parentsKeys)
        ? "parents"
        : hasAny(medicalKeys)
          ? "medical"
          : hasAny(otherKeys)
            ? "other"
            : hasAny(personalKeys)
              ? "personal"
              : "personal"

    setActiveTab(nextTab)
    toast({
      title: "Fix required fields",
      description: "Please review the highlighted fields before submitting.",
      variant: "destructive",
    })
  }

  const handleReset = () => {
    reset()
    setPhotoPreview(initialData?.photo || null)
    toast({
      title: "Form Reset",
      description: "All fields have been cleared.",
    })
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        })
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const nextPhoto = e.target?.result as string
        setPhotoPreview(nextPhoto)
        setValue("photo", nextPhoto, { shouldDirty: true })
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = () => {
    setPhotoPreview(null)
    setValue("photo", "", { shouldDirty: true })
  }

  const selectedClassName = watch("class")
  const classOptions = (classesData || [])
    .map((c) => String(c.name))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))

  const sectionOptions = (() => {
    const selected = (classesData || []).find((c: any) => String(c.name) === String(selectedClassName))
    const sections = (selected?.sections || []) as Array<{ name: string }>
    return sections
      .map((s) => String(s.name))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
  })()

  return (
    <form onSubmit={handleSubmit(handleFormSubmit, handleInvalidSubmit)} className="space-y-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="academic" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Academic</span>
          </TabsTrigger>
          <TabsTrigger value="parents" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Parents</span>
          </TabsTrigger>
          <TabsTrigger value="medical" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Medical</span>
          </TabsTrigger>
          <TabsTrigger value="other" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Other</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={photoPreview || "/placeholder.svg"} alt="Student photo" />
                    <AvatarFallback className="text-2xl">
                      {watch("firstName")?.[0] || "S"}
                      {watch("lastName")?.[0] || ""}
                    </AvatarFallback>
                  </Avatar>
                  {photoPreview && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                      onClick={removePhoto}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Label htmlFor="photo" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                      <Upload className="h-4 w-4" />
                      Upload Photo
                    </div>
                  </Label>
                  <input id="photo" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  <p className="text-xs text-muted-foreground">Max file size: 5MB</p>
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    {...register("firstName")}
                    placeholder="Enter first name"
                    className={errors.firstName ? "border-destructive" : ""}
                  />
                  {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    {...register("lastName")}
                    placeholder="Enter last name"
                    className={errors.lastName ? "border-destructive" : ""}
                  />
                  {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="Enter email address"
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password")}
                    placeholder="Enter password (min 8 characters)"
                    className={errors.password ? "border-destructive" : ""}
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthday">Birthday *</Label>
                  <Input
                    id="birthday"
                    type="date"
                    {...register("birthday")}
                    className={errors.birthday ? "border-destructive" : ""}
                  />
                  {errors.birthday && <p className="text-sm text-destructive">{errors.birthday.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                    placeholder="Enter phone number"
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select
                    onValueChange={(value) => setValue("gender", value as "male" | "female" | "other")}
                    value={watch("gender")}
                  >
                    <SelectTrigger className={errors.gender ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bloodType">Blood Type *</Label>
                  <Select onValueChange={(value) => setValue("bloodType", value)} value={watch("bloodType")}>
                    <SelectTrigger className={errors.bloodType ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select blood type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.bloodType && <p className="text-sm text-destructive">{errors.bloodType.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality *</Label>
                  <Input
                    id="nationality"
                    {...register("nationality")}
                    placeholder="Enter nationality"
                    className={errors.nationality ? "border-destructive" : ""}
                  />
                  {errors.nationality && <p className="text-sm text-destructive">{errors.nationality.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="religion">Religion *</Label>
                  <Select onValueChange={(value) => setValue("religion", value)} value={watch("religion")}>
                    <SelectTrigger className={errors.religion ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select religion" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Islam">Islam</SelectItem>
                      <SelectItem value="Christianity">Christianity</SelectItem>
                      <SelectItem value="Hinduism">Hinduism</SelectItem>
                      <SelectItem value="Buddhism">Buddhism</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.religion && <p className="text-sm text-destructive">{errors.religion.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idCardNumber">ID Card Number *</Label>
                  <Input
                    id="idCardNumber"
                    {...register("idCardNumber")}
                    placeholder="e.g. 2021-03-01-02-01 (Year Semester Class Section Roll)"
                    className={errors.idCardNumber ? "border-destructive" : ""}
                  />
                  {errors.idCardNumber && <p className="text-sm text-destructive">{errors.idCardNumber.message}</p>}
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Address Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Street Address *</Label>
                    <Input
                      id="address"
                      {...register("address")}
                      placeholder="Enter street address"
                      className={errors.address ? "border-destructive" : ""}
                    />
                    {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address2">Address Line 2</Label>
                    <Input
                      id="address2"
                      {...register("address2")}
                      placeholder="Apartment, studio, or floor (optional)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      {...register("city")}
                      placeholder="Enter city"
                      className={errors.city ? "border-destructive" : ""}
                    />
                    {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP Code *</Label>
                    <Input
                      id="zip"
                      {...register("zip")}
                      placeholder="Enter ZIP code"
                      className={errors.zip ? "border-destructive" : ""}
                    />
                    {errors.zip && <p className="text-sm text-destructive">{errors.zip.message}</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Academic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="class">Assign to Class *</Label>
                  <Select
                    onValueChange={(value) => {
                      setValue("class", value, { shouldDirty: true })
                      setValue("section", "", { shouldDirty: true })
                    }}
                    value={watch("class")}
                    disabled={isLoadingClasses}
                  >
                    <SelectTrigger className={errors.class ? "border-destructive" : ""}>
                      <SelectValue placeholder={isLoadingClasses ? "Loading classes..." : "Please select a class"} />
                    </SelectTrigger>
                    <SelectContent>
                      {classOptions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.class && <p className="text-sm text-destructive">{errors.class.message}</p>}
                  {!isLoadingClasses && classOptions.length === 0 && (
                    <div className="text-xs text-muted-foreground">
                      No classes available.&nbsp;
                      <Button asChild variant="link" className="h-auto p-0 align-baseline">
                        <Link href="/dashboard">Create a session/class in Dashboard</Link>
                      </Button>
                      .
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section">Assign to Section *</Label>
                  <Select
                    onValueChange={(value) => setValue("section", value, { shouldDirty: true })}
                    value={watch("section")}
                    disabled={!selectedClassName || isLoadingClasses || sectionOptions.length === 0}
                  >
                    <SelectTrigger className={errors.section ? "border-destructive" : ""}>
                      <SelectValue
                        placeholder={
                          !selectedClassName
                            ? "Select class first"
                            : isLoadingClasses
                              ? "Loading sections..."
                              : sectionOptions.length === 0
                                ? "No sections available"
                                : "Select section"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {sectionOptions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.section && <p className="text-sm text-destructive">{errors.section.message}</p>}
                  {!isLoadingClasses && selectedClassName && sectionOptions.length === 0 && (
                    <div className="text-xs text-muted-foreground">
                      No sections available for this class.&nbsp;
                      <Button asChild variant="link" className="h-auto p-0 align-baseline">
                        <Link href="/dashboard">Create a section in Dashboard</Link>
                      </Button>
                      .
                    </div>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="boardRegistrationNo">Board Registration No.</Label>
                  <Input
                    id="boardRegistrationNo"
                    {...register("boardRegistrationNo")}
                    placeholder="Enter board registration number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parents" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Father's Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fatherName">Father's Name *</Label>
                  <Input
                    id="fatherName"
                    {...register("fatherName")}
                    placeholder="Enter father's name"
                    className={errors.fatherName ? "border-destructive" : ""}
                  />
                  {errors.fatherName && <p className="text-sm text-destructive">{errors.fatherName.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fatherPhone">Father's Phone *</Label>
                  <Input
                    id="fatherPhone"
                    {...register("fatherPhone")}
                    placeholder="Enter father's phone"
                    className={errors.fatherPhone ? "border-destructive" : ""}
                  />
                  {errors.fatherPhone && <p className="text-sm text-destructive">{errors.fatherPhone.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fatherEmail">Father's Email</Label>
                  <Input
                    id="fatherEmail"
                    type="email"
                    {...register("fatherEmail")}
                    placeholder="Enter father's email"
                    className={errors.fatherEmail ? "border-destructive" : ""}
                  />
                  {errors.fatherEmail && <p className="text-sm text-destructive">{errors.fatherEmail.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fatherOccupation">Father's Occupation</Label>
                  <Input
                    id="fatherOccupation"
                    {...register("fatherOccupation")}
                    placeholder="Enter father's occupation"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mother's Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="motherName">Mother's Name *</Label>
                  <Input
                    id="motherName"
                    {...register("motherName")}
                    placeholder="Enter mother's name"
                    className={errors.motherName ? "border-destructive" : ""}
                  />
                  {errors.motherName && <p className="text-sm text-destructive">{errors.motherName.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motherPhone">Mother's Phone *</Label>
                  <Input
                    id="motherPhone"
                    {...register("motherPhone")}
                    placeholder="Enter mother's phone"
                    className={errors.motherPhone ? "border-destructive" : ""}
                  />
                  {errors.motherPhone && <p className="text-sm text-destructive">{errors.motherPhone.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motherEmail">Mother's Email</Label>
                  <Input
                    id="motherEmail"
                    type="email"
                    {...register("motherEmail")}
                    placeholder="Enter mother's email"
                    className={errors.motherEmail ? "border-destructive" : ""}
                  />
                  {errors.motherEmail && <p className="text-sm text-destructive">{errors.motherEmail.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motherOccupation">Mother's Occupation</Label>
                  <Input
                    id="motherOccupation"
                    {...register("motherOccupation")}
                    placeholder="Enter mother's occupation"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact Number *</Label>
                <Input
                  id="emergencyContact"
                  {...register("emergencyContact")}
                  placeholder="Enter emergency contact number"
                  className={errors.emergencyContact ? "border-destructive" : ""}
                />
                {errors.emergencyContact && (
                  <p className="text-sm text-destructive">{errors.emergencyContact.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Medical Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="medicalConditions">Medical Conditions</Label>
                <Textarea
                  id="medicalConditions"
                  {...register("medicalConditions")}
                  placeholder="Enter any medical conditions or write 'None'"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Textarea
                  id="allergies"
                  {...register("allergies")}
                  placeholder="Enter any allergies or write 'None'"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="other" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="previousSchool">Previous School</Label>
                <Input id="previousSchool" {...register("previousSchool")} placeholder="Enter previous school name" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transferReason">Reason for Transfer</Label>
                <Textarea
                  id="transferReason"
                  {...register("transferReason")}
                  placeholder="Enter reason for transfer (if applicable)"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="flex flex-col sm:flex-row gap-4 justify-end pt-6 border-t"
      >
        <Button type="button" variant="outline" onClick={handleReset} className="w-full sm:w-auto bg-transparent">
          Reset
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto bg-transparent">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? "Saving..." : submitButtonText}
        </Button>
      </motion.div>
    </form>
  )
}
