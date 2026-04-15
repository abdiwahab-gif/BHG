"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { User, Settings, LogOut, Shield, Bell, HelpCircle, ChevronDown, Palette } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { clearAuthSession } from "@/lib/session-client"

interface UserDropdownProps {
  user?: {
    name: string
    email: string
    role: string
    avatar?: string
  }
}

export function UserDropdown({
  user,
}: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const [storedUser, setStoredUser] = useState<UserDropdownProps["user"] | undefined>(undefined)

  useEffect(() => {
    if (user) return

    try {
      const raw = localStorage.getItem("user")
      if (!raw) return

      const parsed = JSON.parse(raw)
      const name = [parsed?.firstName, parsed?.lastName].filter(Boolean).join(" ") || parsed?.name || ""
      const email = parsed?.email || ""
      const role = parsed?.role || ""

      if (!email && !name && !role) return

      setStoredUser({
        name: String(name || email || "User"),
        email: String(email || ""),
        role: String(role || ""),
        avatar: parsed?.photo || parsed?.avatar,
      })
    } catch {
      // ignore malformed localStorage
    }
  }, [user])

  const effectiveUser = user || storedUser
  const isAdmin = useMemo(() => {
    const role = (effectiveUser?.role || "").toLowerCase()
    return role === "admin" || role === "super_admin" || role.includes("admin")
  }, [effectiveUser?.role])

  const handleLogout = () => {
    try {
      clearAuthSession()
    } finally {
      setIsOpen(false)
      router.push("/login")
      router.refresh()
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 h-auto p-2 hover:bg-muted/50">
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-foreground">{effectiveUser?.name || "Account"}</span>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs px-2 py-0">
                  {effectiveUser?.role || ""}
                </Badge>
              </div>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarImage src={effectiveUser?.avatar || "/placeholder.svg"} alt={effectiveUser?.name || "User"} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials(effectiveUser?.name || "User")}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{effectiveUser?.name || "Account"}</p>
            <p className="text-xs leading-none text-muted-foreground">{effectiveUser?.email || ""}</p>
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="secondary" className="text-xs">
                {effectiveUser?.role || ""}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/account/profile" onClick={() => setIsOpen(false)}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/account/security" onClick={() => setIsOpen(false)}>
            <Shield className="mr-2 h-4 w-4" />
            <span>Security</span>
          </Link>
        </DropdownMenuItem>

        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/users" onClick={() => setIsOpen(false)}>
                <Settings className="mr-2 h-4 w-4" />
                <span>User List</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/users/add" onClick={() => setIsOpen(false)}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Add User</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/admin/users" onClick={() => setIsOpen(false)}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Admin Users</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuItem className="cursor-pointer flex items-center justify-between">
          <div className="flex items-center">
            <Palette className="mr-2 h-4 w-4" />
            <span>Theme</span>
          </div>
          <ThemeToggle />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
