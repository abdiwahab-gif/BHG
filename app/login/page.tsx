"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, LogIn } from "lucide-react"
import Link from "next/link"
import { setAuthSession } from "@/lib/session-client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const raw = await response.text()
      let data: any = null
      try {
        data = raw ? JSON.parse(raw) : null
      } catch {
        data = null
      }

      if (response.ok && data?.success && data?.token && data?.user) {
        setAuthSession({ token: String(data.token), user: data.user })
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${data.user.firstName || data.user.name}!`,
        })

        // Redirect to fundraising dashboard
        router.push("/fundraising")
      } else {
        const message = (() => {
          if (response.status === 401) return "Incorrect email or password"
          const serverMessage = data?.message || data?.error
          if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage
          if (!response.ok) return `Login failed (HTTP ${response.status})`
          return "Invalid email or password"
        })()

        setErrorMessage(message)
        toast({
          title: "Login Failed",
          description: message,
          variant: "destructive",
        })
      }
    } catch (error) {
      const message = "Failed to connect to server. Please try again."
      setErrorMessage(message)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background/40 p-4">
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
            className="inline-flex items-center justify-center w-20 h-20 bg-black/5 dark:bg-white/5 rounded-2xl mb-4 shadow-lg backdrop-blur-sm"
          >
            <img src="/api/brand/logo" alt="Bah Habar Gobe" className="w-14 h-14 object-contain" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground">Bah Habar Gobe</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        <Card className="shadow-xl border-0 bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Enter your credentials to access the system</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@academic.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-background"
                />
              </div>

              {errorMessage && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}

              <div className="bg-muted/60 p-3 rounded-lg border border-border">
                <p className="text-xs text-foreground font-medium">Demo Credentials:</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Email: <span className="font-mono">admin@academic.edu</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Password: <span className="font-mono">admin123</span>
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <div className="w-full space-y-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
                </Button>
                <Button asChild type="button" variant="outline" className="w-full" disabled={isLoading}>
                  <Link href="/register">Register</Link>
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Need help? Contact your system administrator
        </p>
      </motion.div>
    </div>
  )
}
