"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { SidebarLayout } from "./sidebar-layout"
import {
  clearAuthSession,
  getAuthToken,
  getStoredUser,
  installIdleLogout,
  installSessionActivityTracker,
} from "@/lib/session-client"

const publicRoutes = ["/login", "/register", "/verify-email", "/"]

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isPublicRoute = publicRoutes.includes(pathname)
  const [isAllowed, setIsAllowed] = useState(isPublicRoute)

  const shouldGuard = useMemo(() => !isPublicRoute, [isPublicRoute])

  useEffect(() => {
    if (!shouldGuard) {
      setIsAllowed(true)
      return
    }

    const token = getAuthToken()
    const user = getStoredUser()
    if (!token || !user) {
      clearAuthSession()
      setIsAllowed(false)
      router.replace("/login")
      return
    }

    setIsAllowed(true)
  }, [router, shouldGuard, pathname])

  useEffect(() => {
    if (!shouldGuard) return

    const cleanupActivity = installSessionActivityTracker({ throttleMs: 15_000 })
    const cleanupIdle = installIdleLogout({
      onExpire: () => {
        router.replace("/login")
        router.refresh()
      },
    })

    return () => {
      cleanupIdle()
      cleanupActivity()
    }
  }, [router, shouldGuard])

  if (isPublicRoute) {
    return <>{children}</>
  }

  if (!isAllowed) {
    return null
  }

  return <SidebarLayout>{children}</SidebarLayout>
}
