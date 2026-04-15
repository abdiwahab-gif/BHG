"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null
    const user = typeof window !== 'undefined' ? localStorage.getItem("user") : null

    if (token && user) {
      // User is authenticated, redirect to dashboard
      router.push("/fundraising")
    } else {
      // User is not authenticated, redirect to login
      router.push("/login")
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
