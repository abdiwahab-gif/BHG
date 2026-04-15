"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Loader2, GraduationCap, AlertCircle } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { setAuthSession } from "@/lib/session-client"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = (searchParams.get("token") || "").trim()

  const [message, setMessage] = useState<string>("Verifying...")
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setIsError(true)
        setMessage("Missing verification token")
        return
      }

      try {
        const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
        const data = await response.json().catch(() => null)
        if (response.ok && data?.success && data?.token && data?.user) {
          setAuthSession({ token: String(data.token), user: data.user })
          setIsError(false)
          setMessage("Email verified. Redirecting...")
          router.push("/fundraising")
          return
        }

        const msg =
          (typeof data?.message === "string" && data.message.trim() ? data.message : null) ||
          `Verification failed (HTTP ${response.status})`
        setIsError(true)
        setMessage(msg)
      } catch {
        setIsError(true)
        setMessage("Verification failed. Please try again.")
      }
    }

    run()
  }, [router, token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-2xl mb-4 shadow-lg"
          >
            <GraduationCap className="w-12 h-12" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email verification</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Confirming your account</p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{isError ? "Verification failed" : "Verifying"}</CardTitle>
            <CardDescription>{isError ? "Please request a new verification email" : "Please wait"}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <div className={isError ? "text-destructive flex items-start gap-2" : "text-muted-foreground flex items-start gap-2"}>
              {isError ? <AlertCircle className="h-4 w-4 mt-0.5" /> : <Loader2 className="h-4 w-4 mt-0.5 animate-spin" />}
              <span>{message}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
