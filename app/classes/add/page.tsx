"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CreateClassCard } from "@/components/academic/create-class-card"

export default function AddClassPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background"
    >
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
                <Link href="/classes">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Classes
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 font-sans text-balance">Add Class</h1>
                <p className="text-muted-foreground text-base">Create a new class for an academic session</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="hidden sm:flex items-center gap-2 text-muted-foreground"
            >
              <Users className="h-5 w-5" />
              <span className="text-sm">Class Setup</span>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-2xl mx-auto">
          <CreateClassCard />
        </div>
      </div>
    </motion.div>
  )
}
