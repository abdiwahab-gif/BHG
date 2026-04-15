"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Home, BookOpen, Search } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

type CourseRow = {
  id: string
  code: string
  name: string
  credits: number
  faculty: string
  department: string
}

export default function CoursesPage() {
  const { toast } = useToast()
  const [query, setQuery] = useState("")
  const [submittedQuery, setSubmittedQuery] = useState("")
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const url = useMemo(() => {
    const params = new URLSearchParams()
    if (submittedQuery.trim()) params.set("search", submittedQuery.trim())
    params.set("limit", "200")
    return `/api/courses?${params.toString()}`
  }, [submittedQuery])

  useEffect(() => {
    let cancelled = false

    const loadCourses = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(url)
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.message || body?.error || "Failed to fetch courses")

        const list = Array.isArray(body?.data) ? body.data : Array.isArray(body?.data?.courses) ? body.data.courses : []
        if (cancelled) return

        setCourses(
          list.map((c: any) => ({
            id: String(c.id),
            code: String(c.code || c.courseCode || ""),
            name: String(c.name || c.title || c.courseTitle || ""),
            credits: Number(c.credits ?? c.creditHours ?? c.creditHour ?? 0),
            faculty: String(c.faculty || ""),
            department: String(c.department || ""),
          })),
        )
      } catch (e) {
        if (cancelled) return
        setCourses([])
        toast({
          title: "Error",
          description: e instanceof Error ? e.message : "Failed to load courses",
          variant: "destructive",
        })
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadCourses()
    return () => {
      cancelled = true
    }
  }, [url, toast])

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
              <span>Courses</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-sans text-balance">Courses</h1>
                <p className="text-muted-foreground text-base sm:text-lg">Search and browse courses</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by course name or code"
                />
              </div>
              <Button
                type="button"
                onClick={() => setSubmittedQuery(query)}
                className="w-full sm:w-auto"
                disabled={isLoading}
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Course List</CardTitle>
            <CardDescription>
              {submittedQuery.trim() ? `Results for: ${submittedQuery.trim()}` : "Showing up to 200 courses"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Faculty</TableHead>
                  <TableHead>Department</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                      {isLoading ? "Loading..." : "No courses found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  courses.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.code || "-"}</TableCell>
                      <TableCell>{c.name || "-"}</TableCell>
                      <TableCell>{Number.isFinite(c.credits) ? c.credits : 0}</TableCell>
                      <TableCell>{c.faculty || "-"}</TableCell>
                      <TableCell>{c.department || "-"}</TableCell>
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
