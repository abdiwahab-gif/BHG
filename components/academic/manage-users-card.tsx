"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, ArrowRight } from "lucide-react"

export function ManageUsersCard() {
  const router = useRouter()

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </CardTitle>
              <CardDescription>Manage system users and roles</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-gray-600 mb-4">
            Create, edit, and manage system users with different roles and permissions.
          </p>
          <Button
            onClick={() => router.push("/users")}
            className="w-full"
          >
            Manage Users
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
