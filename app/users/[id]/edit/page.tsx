"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserForm } from "@/components/users/user-form"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { clearAuthSession, getAuthToken } from "@/lib/session-client"

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const userId = (() => {
    const raw = (params as any)?.id
    if (Array.isArray(raw)) return String(raw[0] || "")
    return String(raw || "")
  })()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true)
        setNotFound(false)

        if (!userId) {
          setNotFound(true)
          setUser(null)
          return
        }

        const token = getAuthToken()
        const authHeader = token ? { Authorization: `Bearer ${token}` } : {}
        const response = await fetch(`/api/users/${userId}`, { headers: authHeader })
        const data = await response.json().catch(() => null)

        if (response.status === 401 || response.status === 403) {
          clearAuthSession()
          router.push("/login")
          return
        }

        if (response.status === 404) {
          setNotFound(true)
          setUser(null)
          return
        }

        if (response.ok && data?.success) {
          setUser(data.data)
          return
        }

        toast({
          title: "Error",
          description: typeof data?.message === "string" ? data.message : "Failed to load user",
          variant: "destructive",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load user",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [userId, router, toast])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (notFound) {
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

        <div className="rounded-md border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">User not found</h2>
          <p className="text-sm text-muted-foreground mt-1">The requested user does not exist in the database.</p>
        </div>
      </div>
    )
  }

  if (!user) {
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
        <div className="rounded-md border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Unable to load user</h2>
          <p className="text-sm text-muted-foreground mt-1">Please try again.</p>
        </div>
      </div>
    )
  }

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

      <UserForm user={user} />
    </div>
  )
}
