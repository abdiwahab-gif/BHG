"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Home, Calendar } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

type SessionRow = {
  id: string
  name: string
  isActive: boolean
}

type SemesterRow = {
  id: string
  sessionId: string
  name: string
  startDate: string
  endDate: string
}

export default function SemestersPage() {
  const { toast } = useToast()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [semesters, setSemesters] = useState<SemesterRow[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadSessions = async () => {
      try {
        const res = await fetch("/api/sessions")
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.message || body?.error || "Failed to fetch sessions")

        const list = Array.isArray(body?.data?.sessions) ? body.data.sessions : []
        const mapped = list.map((s: any) => ({ id: String(s.id), name: String(s.name), isActive: Boolean(s.isActive) }))
        if (cancelled) return

        setSessions(mapped)
        const active = mapped.find((s) => s.isActive) || mapped[0]
        setSelectedSessionId((prev) => prev || (active ? active.id : ""))
      } catch (e) {
        if (cancelled) return
        setSessions([])
        setSelectedSessionId("")
        toast({
          title: "Error",
          description: e instanceof Error ? e.message : "Failed to load sessions",
          variant: "destructive",
        })
      }
    }

    void loadSessions()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadSemesters = async () => {
      if (!selectedSessionId) {
        setSemesters([])
        return
      }

      setIsLoading(true)
      try {
        const res = await fetch(`/api/semesters?sessionId=${encodeURIComponent(selectedSessionId)}`)
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.message || body?.error || "Failed to fetch semesters")

        const list = Array.isArray(body?.data) ? body.data : []
        if (cancelled) return

        setSemesters(
          list.map((s: any) => ({
            id: String(s.id),
            sessionId: String(s.sessionId),
            name: String(s.name),
            startDate: String(s.startDate || ""),
            endDate: String(s.endDate || ""),
          })),
        )
      } catch (e) {
        if (cancelled) return
        setSemesters([])
        toast({
          title: "Error",
          description: e instanceof Error ? e.message : "Failed to load semesters",
          variant: "destructive",
        })
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadSemesters()
    return () => {
      cancelled = true
    }
  }, [selectedSessionId, toast])

  const selectedSession = sessions.find((s) => s.id === selectedSessionId)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background"
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="border-b border-border bg-card/30 backdrop-blur-sm"
      >
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
                <Home className="h-4 w-4" />
                Home
              </Link>
              <span>/</span>
              <span>Semesters</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-sans text-balance">Semesters</h1>
                <p className="text-muted-foreground text-base sm:text-lg">View semesters for a session</p>
              </div>
            </div>

            <div className="w-full sm:w-64">
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No sessions found
                    </SelectItem>
                  ) : (
                    sessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}{s.isActive ? " (Active)" : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Semesters</CardTitle>
            <CardDescription>
              {selectedSession ? `Session: ${selectedSession.name}` : "Select a session"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {semesters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                      {isLoading ? "Loading..." : "No semesters found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  semesters.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.startDate || "-"}</TableCell>
                      <TableCell>{s.endDate || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
