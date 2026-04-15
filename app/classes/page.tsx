"use client"

import { useEffect, useState } from "react"
import { Home, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ClassList } from "@/components/classes/class-list"
import { useClasses } from "@/hooks/use-classes"
import { Skeleton } from "@/components/ui/skeleton"

export default function ClassesPage() {
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("")
  const { data: classes, isLoading, error } = useClasses(selectedAcademicYear || undefined)

  useEffect(() => {
    let cancelled = false

    const loadActiveSession = async () => {
      try {
        const res = await fetch("/api/sessions")
        const body = await res.json().catch(() => null)
        if (!res.ok) return

        const sessions = Array.isArray(body?.data?.sessions) ? body.data.sessions : []
        const active = sessions.find((s: any) => Boolean(s?.isActive))
        if (!cancelled) {
          setSelectedAcademicYear(typeof active?.name === "string" ? active.name : "")
        }
      } catch {
        // If sessions are unavailable, fall back to showing all classes.
        if (!cancelled) setSelectedAcademicYear("")
      }
    }

    void loadActiveSession()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Classes</h2>
          <p className="text-muted-foreground">Failed to load classes. Please try again later.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Breadcrumb */}
      <div className="border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              {/* Breadcrumb Navigation */}
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                <Home className="h-4 w-4" />
                <span>Home</span>
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground font-medium">Classes</span>
              </nav>

              {/* Page Title */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                    <div className="w-3 h-3 bg-primary-foreground rounded-sm"></div>
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-sans text-balance">Classes</h1>
              </div>
            </div>

            {/* Academic Year Display */}
            <div className="hidden sm:block">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Current Academic Session</p>
                <p className="font-semibold text-foreground">{selectedAcademicYear || "All"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="space-y-6">
            {/* Loading skeleton for class cards */}
            {[1, 2].map((i) => (
              <div key={i} className="border border-border rounded-lg p-6 bg-card">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-9 w-24" />
                </div>
                <div className="space-y-4">
                  <div className="flex space-x-1">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-10 w-20" />
                    ))}
                  </div>
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {classes && classes.length > 0 ? (
              <ClassList classes={classes} />
            ) : (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 bg-muted-foreground/20 rounded"></div>
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Classes Found</h3>
                  <p className="text-sm sm:text-base">
                    No classes are available for the {selectedAcademicYear} academic year.
                  </p>
                </div>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Refresh
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
