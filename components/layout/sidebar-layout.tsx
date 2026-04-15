"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Sidebar } from "./sidebar"
import { MobileHeader } from "./mobile-header"
import { UserDropdown } from "./user-dropdown"
import { ThemeToggleButton } from "@/components/ui/theme-toggle"

interface SidebarLayoutProps {
  children: React.ReactNode
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)

      if (mobile) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleMobileClose = () => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={handleMobileClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed && !isMobile ? "w-16" : "w-64",
        )}
        animate={{
          width: sidebarCollapsed && !isMobile ? 64 : 256,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          isMobile={isMobile}
          onMobileClose={handleMobileClose}
        />
      </motion.aside>

      {/* Main Content */}
      <motion.div
        className="min-h-screen"
        animate={{
          marginLeft: !isMobile ? (sidebarCollapsed ? 64 : 256) : 0,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Header */}
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        >
          <div className="flex h-16 items-center gap-4 px-4">
            <MobileHeader sidebarOpen={sidebarOpen} onSidebarToggle={handleSidebarToggle} />

            {!isMobile && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 hover:bg-muted rounded-md transition-colors"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </motion.button>
            )}

            <div className="flex-1" />

            <motion.div 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2"
            >
              <ThemeToggleButton />
              <UserDropdown />
            </motion.div>
          </div>
        </motion.header>

        {/* Page Content */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex-1"
        >
          {children}
        </motion.main>
      </motion.div>
    </div>
  )
}
