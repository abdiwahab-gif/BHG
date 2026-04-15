"use client"

import { motion } from "framer-motion"
import { UserPlus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TeachersTable } from "@/components/teachers/teachers-table"
import Link from "next/link"
import { useState } from "react"

export default function TeachersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [genderFilter, setGenderFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

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
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 font-sans text-balance">
                Teachers Management
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg">
                Manage teacher profiles, assignments, and information
              </p>
            </motion.div>

            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <Button asChild className="flex items-center gap-2">
                <Link href="/teachers/add">
                  <UserPlus className="h-4 w-4" />
                  Add Teacher
                </Link>
              </Button>
            </motion.div>
          </div>

          {/* Filters */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-6 flex flex-col sm:flex-row gap-4"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search teachers by name, email, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <TeachersTable searchQuery={searchQuery} genderFilter={genderFilter} statusFilter={statusFilter} />
        </motion.div>
      </div>
    </motion.div>
  )
}
