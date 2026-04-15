"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Loader2, GraduationCap, UserPlus, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { validatePasswordPolicy } from "@/lib/password-policy"

type InviteInfo = {
  email: string
  name: string
  role: string
  expiresAt: string
}

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // If user came from an admin invite email, the token is already in the URL.
  const inviteToken = (searchParams.get("token") || "").trim()

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [isLoadingInvite, setIsLoadingInvite] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const passwordErrors = useMemo(() => {
    if (!password) return []
    const res = validatePasswordPolicy(password)
    return res.isValid ? [] : res.errors
  }, [password])

  useEffect(() => {
    const loadInvite = async () => {
      if (!inviteToken) return
      setIsLoadingInvite(true)
      setErrorMessage(null)
      try {
        const response = await fetch(`/api/auth/invitations/verify?token=${encodeURIComponent(inviteToken)}`)
        const data = await response.json().catch(() => null)
        if (response.ok && data?.success && data?.data?.email) {
          setInvite(data.data)
          setEmail(String(data.data.email || ""))
          setName(String(data.data.name || ""))
          return
        }

        const msg =
          (typeof data?.message === "string" && data.message.trim() ? data.message : null) ||
          (response.status === 404 ? "Invitation not found" : `Failed to verify invitation (HTTP ${response.status})`)
        setInvite(null)
        setErrorMessage(msg)
      } catch {
        setInvite(null)
        setErrorMessage("Failed to verify invitation. Please try again.")
      } finally {
        setIsLoadingInvite(false)
      }
    }

    loadInvite()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteToken])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const finalName = name.trim()
    const finalEmail = email.trim()

    if (!finalName) {
      setErrorMessage("Name is required")
      return
    }

    if (!inviteToken) {
      if (!finalEmail) {
        setErrorMessage("Email is required")
        return
      }
    }

    const policy = validatePasswordPolicy(password)
    if (!policy.isValid) {
      setErrorMessage(policy.errors[0] || "Password does not meet the policy")
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match")
      return
    }

    setIsSubmitting(true)
    try {
      const payload = inviteToken
        ? { token: inviteToken, password, name: finalName }
        : { email: finalEmail, password, name: finalName }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => null)

      // Registration can return token+user (auto-login)
      if (response.ok && data?.success && data?.token && data?.user) {
        try {
          const { setAuthSession } = await import("@/lib/session-client")
          setAuthSession({ token: String(data.token), user: data.user })
        } catch {
          // ignore
        }

        toast({
          title: "Registration complete",
          description: "Your account is ready. Welcome!",
        })
        router.push("/fundraising")
        return
      }

      // Self-registration sends verification email
      if (!inviteToken && response.ok && data?.success) {
        toast({
          title: "Check your email",
          description: "We sent a verification link to activate your account.",
        })
        router.push("/login")
        return
      }

      const msg =
        (typeof data?.message === "string" && data.message.trim() ? data.message : null) ||
        `Registration failed (HTTP ${response.status})`
      setErrorMessage(msg)
      toast({ title: "Registration failed", description: msg, variant: "destructive" })
    } catch {
      const msg = "Failed to complete registration. Please try again."
      setErrorMessage(msg)
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create your account</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {inviteToken ? "Use the invitation link sent to your email" : "Create an account to access the system"}
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>
              {inviteToken
                ? "Set a strong password to activate your invited account"
                : "Create your account with a strong password"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={Boolean(inviteToken) || isSubmitting || isLoadingInvite}
                  className="bg-white dark:bg-gray-900"
                />
              </div>

              {inviteToken && (
                <div className="rounded-md border border-border bg-card px-3 py-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role</span>
                    <span className="font-medium">{invite?.role || ""}</span>
                  </div>
                  {isLoadingInvite && (
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading invitation...
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting || isLoadingInvite}
                  className="bg-white dark:bg-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 12 chars: upper, lower, number, special"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting || isLoadingInvite}
                  className="bg-white dark:bg-gray-900"
                />
                {passwordErrors.length > 0 && (
                  <ul className="text-xs text-destructive list-disc pl-4">
                    {passwordErrors.slice(0, 3).map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting || isLoadingInvite}
                  className="bg-white dark:bg-gray-900"
                />
              </div>

              {errorMessage && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting || isLoadingInvite}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {inviteToken ? "Creating account..." : "Submitting..."}
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {inviteToken ? "Complete Registration" : "Register"}
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  )
}
