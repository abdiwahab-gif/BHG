"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Home, CalendarDays } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

type SessionRow = {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
}

export default function SessionsPage() {
  const { toast } = useToast()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/sessions")
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.message || body?.error || "Failed to fetch sessions")

      const list = Array.isArray(body?.data?.sessions) ? body.data.sessions : []
      setSessions(
        list.map((s: any) => ({
          id: String(s.id),
          name: String(s.name),
          startDate: String(s.startDate || ""),
          endDate: String(s.endDate || ""),
          isActive: Boolean(s.isActive),
        })),
      )
    } catch (e) {
      setSessions([])
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to load sessions",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setActive = async (sessionId: string) => {
    try {
      const res = await fetch("/api/sessions/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.message || body?.error || "Failed to set active session")
      toast({ title: "Success", description: "Active session updated" })
      await load()
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to set active session",
        variant: "destructive",
      })
    }
  }

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
              <span>Sessions</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <CalendarDays className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-sans text-balance">Academic Sessions</h1>
              <p className="text-muted-foreground text-base sm:text-lg">View and set the active academic session</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>{isLoading ? "Loading sessions..." : "All sessions in the system"}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-40"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                      {isLoading ? "Loading..." : "No sessions found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.startDate || "-"}</TableCell>
                      <TableCell>{s.endDate || "-"}</TableCell>
                      <TableCell>
                        {s.isActive ? (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" disabled={s.isActive} onClick={() => setActive(s.id)}>
                          Set Active
                        </Button>
                      </TableCell>
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
