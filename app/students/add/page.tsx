"use client"
import { StudentForm } from "@/components/students/student-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info, Home } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type StudentFormData = {
  firstName: string
  lastName: string
  email: string
  password: string
  photo?: string
  birthday: string
  phone: string
  class: string
  section: string
  gender: "male" | "female" | "other"
  bloodType: string
  nationality: string
  religion: string
  address: string
  address2?: string
  city: string
  zip: string
  idCardNumber: string
  boardRegistrationNo?: string
  fatherName: string
  motherName: string
  fatherPhone: string
  motherPhone: string
  fatherOccupation?: string
  motherOccupation?: string
  fatherEmail?: string
  motherEmail?: string
  emergencyContact: string
  medicalConditions?: string
  allergies?: string
  previousSchool?: string
  transferReason?: string
}

export default function AddStudentPage() {
  const router = useRouter()

  const handleSubmit = async (data: StudentFormData) => {
    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const body = await response
        .json()
        .catch(() => null)

      if (!response.ok) {
        const message =
          typeof body?.error === "string"
            ? body.error
            : typeof body?.message === "string"
              ? body.message
              : typeof body?.details === "string"
                ? body.details
                : `Failed to create student (HTTP ${response.status})`
        throw new Error(message)
      }

      // Redirect to students list after successful creation
      router.push("/students")
    } catch (error) {
      throw error
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
                <Home className="h-4 w-4" />
                Home
              </Link>
              <span>/</span>
              <Link href="/students" className="hover:text-foreground transition-colors">
                Students
              </Link>
              <span>/</span>
              <span>Add Student</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">👤</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-sans text-balance">Add Student</h1>
              <p className="text-muted-foreground text-base sm:text-lg">Create a new student record</p>
            </div>
          </div>

          <Alert className="mt-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Remember to create related "Class" and "Section" before adding student
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <StudentForm onSubmit={handleSubmit} submitButtonText="Add Student" isEditing={false} />
      </div>
    </div>
  )
}
