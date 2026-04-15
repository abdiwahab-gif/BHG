"use client"

import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserForm } from "@/components/users/user-form"
import Link from "next/link"

export default function AddUserPage() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/users">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Link>
        </Button>
      </motion.div>

      <UserForm />
    </div>
  )
}
