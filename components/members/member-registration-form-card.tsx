"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Upload, X } from "lucide-react"
import { getAuthAndAuditHeaders } from "@/lib/client-auth"

const memberSchema = z.object({
  photo: z.string().min(1, "Photo is required"),
  fullName: z.string().min(2, "Full name is required"),
  gender: z.string().min(1, "Gender is required").refine((v) => v === "male" || v === "female", "Gender is required"),
  mobileNumber: z.string().min(7, "Mobile number is required"),
  email: z.string().email("Invalid email"),
  deggen: z.string().min(2, "Deggan is required"),
  shaqada: z.string().min(2, "Shaqada is required"),
  masuulkaaga: z.string().min(2, "Masuulkaaga is required"),
})

export type MemberFormData = z.infer<typeof memberSchema>

export type MemberRegistrationFormCardProps = {
  onSuccess?: () => void
  initialData?: Partial<MemberFormData>
  memberId?: string
  submitLabel?: string
  title?: string
  description?: string
}

type DeggenChoice = "" | "Borama" | "Wajaale" | "Hargeisa" | "Other"

type JobChoice =
  | ""
  | "Business / Industry"
  | "Education"
  | "Engineering"
  | "Healthcare"
  | "Government"
  | "Own Business"
  | "Unemployed"
  | "Other"

function parseDeggenChoice(value: string | undefined): { choice: DeggenChoice; other: string } {
  const raw = String(value || "").trim()
  const lower = raw.toLowerCase()
  if (lower === "borama") return { choice: "Borama", other: "" }
  if (lower === "wajaale") return { choice: "Wajaale", other: "" }
  if (lower === "hargeisa") return { choice: "Hargeisa", other: "" }
  if (!raw) return { choice: "", other: "" }
  return { choice: "Other", other: raw }
}

function parseJobChoice(value: string | undefined): { choice: JobChoice; other: string } {
  const raw = String(value || "").trim()
  const lower = raw.toLowerCase()
  if (lower === "business / industry" || lower === "business" || lower === "industry")
    return { choice: "Business / Industry", other: "" }
  if (lower === "education" || lower === "education institution" || lower === "school" || lower === "university")
    return { choice: "Education", other: "" }
  if (lower === "engineering" || lower === "engineer") return { choice: "Engineering", other: "" }
  if (lower === "healthcare" || lower === "health" || lower === "medical") return { choice: "Healthcare", other: "" }
  if (lower === "government" || lower === "public sector") return { choice: "Government", other: "" }
  if (lower === "own business" || lower === "business owner" || lower === "owner") return { choice: "Own Business", other: "" }
  if (lower === "unemployed" || lower === "none") return { choice: "Unemployed", other: "" }
  if (!raw) return { choice: "", other: "" }
  return { choice: "Other", other: raw }
}

function initialsFromName(name: string): string {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean)
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("")
  return initials || "M"
}

export function MemberRegistrationFormCard({
  onSuccess,
  initialData,
  memberId,
  submitLabel,
  title,
  description,
}: MemberRegistrationFormCardProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [deggenChoice, setDeggenChoice] = useState<DeggenChoice>("")
  const [deggenOther, setDeggenOther] = useState("")
  const [jobChoice, setJobChoice] = useState<JobChoice>("")
  const [jobOther, setJobOther] = useState("")

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      photo: "",
      fullName: "",
      gender: "",
      mobileNumber: "",
      email: "",
      deggen: "",
      shaqada: "",
      masuulkaaga: "",
    },
  })

  useEffect(() => {
    const { choice, other } = parseDeggenChoice(initialData?.deggen)
    const { choice: nextJobChoice, other: nextJobOther } = parseJobChoice(initialData?.shaqada)
    const nextValues: MemberFormData = {
      photo: initialData?.photo || "",
      fullName: initialData?.fullName || "",
      gender: initialData?.gender || "",
      mobileNumber: initialData?.mobileNumber || "",
      email: initialData?.email || "",
      deggen: choice === "Other" ? other : choice,
      shaqada: nextJobChoice === "Other" ? nextJobOther : nextJobChoice,
      masuulkaaga: initialData?.masuulkaaga || "",
    }
    reset(nextValues)
    setPhotoPreview(typeof initialData?.photo === "string" && initialData.photo ? initialData.photo : null)
    setDeggenChoice(choice)
    setDeggenOther(choice === "Other" ? other : "")
    setJobChoice(nextJobChoice)
    setJobOther(nextJobChoice === "Other" ? nextJobOther : "")
  }, [
    reset,
    memberId,
    initialData?.photo,
    initialData?.fullName,
    initialData?.gender,
    initialData?.mobileNumber,
    initialData?.email,
    initialData?.deggen,
    initialData?.shaqada,
    initialData?.masuulkaaga,
  ])

  const fullName = watch("fullName")
  const fallbackInitials = useMemo(() => initialsFromName(fullName), [fullName])

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

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

  const removePhoto = () => {
    setPhotoPreview(null)
    setValue("photo", "", { shouldDirty: true })
  }

  const onSubmit = async (data: MemberFormData) => {
    setIsSubmitting(true)
    try {
      const isEditing = Boolean(memberId)
      const url = isEditing ? `/api/members/${encodeURIComponent(String(memberId))}` : "/api/members"

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...getAuthAndAuditHeaders() },
        body: JSON.stringify(data),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : typeof payload?.message === "string"
              ? payload.message
              : `Request failed (HTTP ${response.status})`
        toast({ title: isEditing ? "Update failed" : "Registration failed", description: message, variant: "destructive" })
        return
      }

      toast({
        title: isEditing ? "Updated" : "Registered",
        description: isEditing ? "Member details were updated successfully." : "Your member registration was submitted successfully.",
      })

      if (!isEditing) {
        reset()
        setPhotoPreview(null)
      }
      onSuccess?.()
    } catch {
      toast({
        title: memberId ? "Update failed" : "Registration failed",
        description: "Could not connect to the server. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title || (memberId ? "Edit Member" : "Member Registration")}</CardTitle>
        <CardDescription>{description || (memberId ? "Update member details." : "Register yourself by filling the details below.")}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-28 w-28">
                <AvatarImage src={photoPreview || "/placeholder.svg"} alt="Member photo" />
                <AvatarFallback className="text-xl">{fallbackInitials}</AvatarFallback>
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
              {errors.photo?.message && <p className="text-sm text-destructive">{errors.photo.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name (Magaca oo Dhameystiran)</Label>
            <Input id="fullName" placeholder="Your full name" required {...register("fullName")} aria-invalid={!!errors.fullName} />
            {errors.fullName?.message && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobileNumber">Mobile Number</Label>
            <Input
              id="mobileNumber"
              placeholder="e.g. +252xxxxxxxx"
              required
              {...register("mobileNumber")}
              aria-invalid={!!errors.mobileNumber}
            />
            {errors.mobileNumber?.message && <p className="text-sm text-destructive">{errors.mobileNumber.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" required {...register("email")} aria-invalid={!!errors.email} />
            {errors.email?.message && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <input type="hidden" {...register("gender")} />
            <Select
              value={String(watch("gender") || "")}
              onValueChange={(value) => {
                setValue("gender", value, { shouldDirty: true, shouldValidate: true })
              }}
            >
              <SelectTrigger id="gender" aria-invalid={!!errors.gender}>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender?.message && <p className="text-sm text-destructive">{errors.gender.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deggen">Deggan</Label>
            <input type="hidden" {...register("deggen")} />
            <Select
              value={deggenChoice}
              onValueChange={(value) => {
                const next = value as DeggenChoice
                setDeggenChoice(next)
                if (next === "Other") {
                  const nextOther = deggenOther.trim()
                  setValue("deggen", nextOther, { shouldDirty: true, shouldValidate: true })
                } else {
                  setDeggenOther("")
                  setValue("deggen", next, { shouldDirty: true, shouldValidate: true })
                }
              }}
            >
              <SelectTrigger id="deggen" aria-invalid={!!errors.deggen}>
                <SelectValue placeholder="Select where you live" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Borama">Borama</SelectItem>
                <SelectItem value="Wajaale">Wajaale</SelectItem>
                <SelectItem value="Hargeisa">Hargeisa</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>

            {deggenChoice === "Other" && (
              <Input
                placeholder="Enter where you live"
                value={deggenOther}
                required
                onChange={(e) => {
                  const next = e.target.value
                  setDeggenOther(next)
                  setValue("deggen", next.trim(), { shouldDirty: true, shouldValidate: true })
                }}
                aria-invalid={!!errors.deggen}
              />
            )}
            {errors.deggen?.message && <p className="text-sm text-destructive">{errors.deggen.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="shaqada">Shaqada</Label>
            <input type="hidden" {...register("shaqada")} />
            <Select
              value={jobChoice}
              onValueChange={(value) => {
                const next = value as JobChoice
                setJobChoice(next)
                if (next === "Other") {
                  const nextOther = jobOther.trim()
                  setValue("shaqada", nextOther, { shouldDirty: true, shouldValidate: true })
                } else {
                  setJobOther("")
                  setValue("shaqada", next, { shouldDirty: true, shouldValidate: true })
                }
              }}
            >
              <SelectTrigger id="shaqada" aria-invalid={!!errors.shaqada}>
                <SelectValue placeholder="Select your job" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Business / Industry">Business / Industry</SelectItem>
                <SelectItem value="Education">Education</SelectItem>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="Healthcare">Healthcare</SelectItem>
                <SelectItem value="Government">Government</SelectItem>
                <SelectItem value="Own Business">Own Business</SelectItem>
                <SelectItem value="Unemployed">Unemployed</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>

            {jobChoice === "Other" && (
              <Input
                placeholder="Enter your job"
                value={jobOther}
                required
                onChange={(e) => {
                  const next = e.target.value
                  setJobOther(next)
                  setValue("shaqada", next.trim(), { shouldDirty: true, shouldValidate: true })
                }}
                aria-invalid={!!errors.shaqada}
              />
            )}
            {errors.shaqada?.message && <p className="text-sm text-destructive">{errors.shaqada.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="masuulkaaga">Masuulkaaga</Label>
            <Input
              id="masuulkaaga"
              placeholder="Your responsible person"
              required
              {...register("masuulkaaga")}
              aria-invalid={!!errors.masuulkaaga}
            />
            {errors.masuulkaaga?.message && <p className="text-sm text-destructive">{errors.masuulkaaga.message}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              submitLabel || (memberId ? "Save Changes" : "Register")
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
