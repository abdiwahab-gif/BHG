"use client"

import { motion } from "framer-motion"
import { ArrowLeft, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TeacherForm } from "@/components/teachers/teacher-form"
import Link from "next/link"

export default function AddTeacherPage() {
  // Route guard to ensure this is the add page
  if (typeof window !== "undefined" && !window.location.pathname.endsWith("/add")) {
    return null
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
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex items-center gap-4"
            >
              <Button asChild variant="ghost" size="sm" className="flex items-center gap-2">
                <Link href="/teachers">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Teachers
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 font-sans text-balance">
                  Add New Teacher
                </h1>
                <p className="text-muted-foreground text-base">
                  Fill in the details to add a new teacher to the system
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="hidden sm:flex items-center gap-2 text-muted-foreground"
            >
              <UserPlus className="h-5 w-5" />
              <span className="text-sm">New Teacher Registration</span>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <TeacherForm />
      </div>
    </motion.div>
  )
}
