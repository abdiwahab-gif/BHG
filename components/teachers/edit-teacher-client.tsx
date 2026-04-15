"use client"

import { motion } from "framer-motion"
import { TeacherForm } from "@/components/teachers/teacher-form"
import { useTeacher } from "@/hooks/use-teachers"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface EditTeacherClientProps {
  teacherId: string
}

export function EditTeacherClient({ teacherId }: EditTeacherClientProps) {
  const { data, isLoading, error } = useTeacher(teacherId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading teacher data...
        </div>
      </div>
    )
  }

  if (error || !data?.teacher) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-destructive mb-2">Teacher Not Found</h2>
        <p className="text-muted-foreground mb-4">The teacher you're trying to edit doesn't exist.</p>
        <Button asChild>
          <Link href="/teachers">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teachers
          </Link>
        </Button>
      </div>
    )
  }

  const teacher = data.teacher

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <TeacherForm initialData={teacher} isEditing={true} teacherId={teacherId} />
    </motion.div>
  )
}
