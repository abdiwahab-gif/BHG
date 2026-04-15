"use client"

import { motion } from "framer-motion"
import { StudentForm } from "@/components/students/student-form"
import { GraduationCap, Home } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useStudent } from "@/hooks/use-students"
import { Button } from "@/components/ui/button"

export default function EditStudentPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const studentId = params.id as string

  const { student, loading, error, refresh } = useStudent(studentId)

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Loading student...
          </div>
        </div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-12">
          <h1 className="text-xl font-semibold text-foreground mb-2">Student not found</h1>
          <p className="text-muted-foreground mb-6">Unable to load this student record.</p>
          <Button asChild variant="outline">
            <Link href="/students">Back to Students</Link>
          </Button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error || `HTTP error! status: ${response.status}`)
      }

      await response.json()
      refresh()

      toast({
        title: "Student Updated",
        description: "Student information has been successfully updated.",
      })

      // Redirect to student detail page
      router.push(`/students/${studentId}`)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update student. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    router.push(`/students/${studentId}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="border-b border-border bg-card/30 backdrop-blur-sm"
      >
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
              <Link href={`/students/${studentId}`} className="hover:text-foreground transition-colors">
                {student.firstName} {student.lastName}
              </Link>
              <span>/</span>
              <span>Edit</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-sans text-balance">Edit Student</h1>
              <p className="text-muted-foreground text-base sm:text-lg">
                Update {student.firstName} {student.lastName}'s information
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <StudentForm
            initialData={student}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitButtonText="Update Student"
            isEditing={true}
          />
        </motion.div>
      </div>
    </motion.div>
  )
}
