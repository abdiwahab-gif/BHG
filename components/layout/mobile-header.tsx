"use client"

import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MobileHeaderProps {
  sidebarOpen: boolean
  onSidebarToggle: () => void
}

export function MobileHeader({ sidebarOpen, onSidebarToggle }: MobileHeaderProps) {
  return (
    <div className="flex lg:hidden items-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={onSidebarToggle}
        className="h-10 w-10 hover:bg-muted transition-colors"
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
    </div>
  )
}
