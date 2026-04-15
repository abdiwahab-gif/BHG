"use client"

import { useEffect, useState } from "react"
import { BookOpen, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

type SessionItem = {
  id: string
  name: string
  isActive: boolean
}

export function BrowseSessionCard() {
  const [selectedSession, setSelectedSession] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingSessions, setIsFetchingSessions] = useState(false)
  const { toast } = useToast()

  const [sessions, setSessions] = useState<SessionItem[]>([])

  useEffect(() => {
    let cancelled = false

    const loadSessions = async () => {
      try {
        setIsFetchingSessions(true)
        const res = await fetch("/api/sessions")
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.message || "Failed to fetch sessions")

        const list: SessionItem[] = (data?.data?.sessions || []).map((s: any) => ({
          id: String(s.id),
          name: String(s.name),
          isActive: Boolean(s.isActive),
        }))

        if (cancelled) return
        setSessions(list)

        setSelectedSession((prev) => {
          if (prev && list.some((s) => s.id === prev)) return prev
          const active = list.find((s) => s.isActive)
          return active?.id || ""
        })
      } catch (e: any) {
        if (cancelled) return
        toast({
          title: "Error",
          description: e?.message || "Failed to fetch sessions",
          variant: "destructive",
        })
      } finally {
        if (!cancelled) setIsFetchingSessions(false)
      }
    }

    void loadSessions()

    const onSessionsChanged = () => {
      void loadSessions()
    }

    window.addEventListener("sessions:changed", onSessionsChanged)

    return () => {
      cancelled = true
      window.removeEventListener("sessions:changed", onSessionsChanged)
    }
  }, [toast])

  const handleSetSession = async () => {
    if (!selectedSession) {
      toast({
        title: "Error",
        description: "Please select a session",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/sessions/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSession }),
      })

      const data = await res.json().catch(() => null)

      if (res.ok) {
        const activeName = sessions.find((s) => s.id === selectedSession)?.name || ""
        toast({
          title: "Success",
          description: data?.message || `Switched to session "${activeName}"`,
        })
        setSessions((prev) => prev.map((s) => ({ ...s, isActive: s.id === selectedSession })))
      } else {
        toast({
          title: "Error",
          description: data?.message || "Failed to set active session",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to set active session",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-sans">Browse by Session</CardTitle>
        </div>
        <CardDescription>Navigate through different academic sessions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="session-select" className="text-sm font-medium">
            Select Session
          </Label>
          <Select value={selectedSession} onValueChange={setSelectedSession} disabled={isFetchingSessions || sessions.length === 0}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue
                placeholder={
                  isFetchingSessions
                    ? "Loading sessions..."
                    : sessions.length === 0
                      ? "No sessions available"
                      : "Choose academic session"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {isFetchingSessions ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
              ) : sessions.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No sessions found. Create one first.</div>
              ) : (
                sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {sessions.length === 0 && !isFetchingSessions ? (
            <p className="text-xs text-muted-foreground">Create a session to start browsing.</p>
          ) : null}
        </div>
        <Button
          onClick={handleSetSession}
          disabled={isLoading || isFetchingSessions || sessions.length === 0}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Setting...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Set
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
