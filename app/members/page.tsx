"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Home, Users } from "lucide-react"

import { MembersTable } from "@/components/members/members-table"

export default function MembersPage() {
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
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
                <Home className="h-4 w-4" />
                Home
              </Link>
              <span>/</span>
              <span>Members</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-sans text-balance">Members</h1>
              <p className="text-muted-foreground text-base sm:text-lg">View and manage member registrations</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        <MembersTable />
      </div>
    </motion.div>
  )
}
