"use client"

import { useEffect, useState } from "react"
import { Users, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useCreateClass } from "@/hooks/use-classes"

export function CreateClassCard() {
  const [className, setClassName] = useState("")
  const [description, setDescription] = useState("")
  const [academicYear, setAcademicYear] = useState("")
  const [sessions, setSessions] = useState<Array<{ id: string; name: string; isActive: boolean }>>([])
  const [isFetchingSessions, setIsFetchingSessions] = useState(false)
  const { toast } = useToast()

  const createClassMutation = useCreateClass()

  useEffect(() => {
    let cancelled = false

    const loadSessions = async () => {
      setIsFetchingSessions(true)
      try {
        const res = await fetch("/api/sessions")
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.message || "Failed to fetch sessions")

        const list = Array.isArray(body?.data?.sessions) ? body.data.sessions : []
        const mapped = list.map((s: any) => ({
          id: String(s.id),
          name: String(s.name),
          isActive: Boolean(s.isActive),
        }))

        if (cancelled) return
        setSessions(mapped)

        setAcademicYear((prev) => {
          if (prev && mapped.some((s) => s.name === prev)) return prev
          const active = mapped.find((s) => s.isActive)
          return active?.name || mapped[0]?.name || ""
        })
      } catch (e: any) {
        if (cancelled) return
        setSessions([])
        setAcademicYear("")
        toast({
          title: "Sessions missing",
          description: e?.message || "Create an academic session first to create classes.",
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

  const handleCreateClass = async () => {
    if (!className.trim()) {
      toast({
        title: "Error",
        description: "Please enter a class name",
        variant: "destructive",
      })
      return
    }

    if (!academicYear) {
      toast({
        title: "Error",
        description: "Please select an academic session",
        variant: "destructive",
      })
      return
    }

    createClassMutation.mutate(
      {
        name: className.trim(),
        description: description.trim(),
        academicYear,
      },
      {
        onSuccess: () => {
          // Reset form on success
          setClassName("")
          setDescription("")
          window.dispatchEvent(new Event("classes:changed"))
          // Toast is handled by the hook
        },
        onError: (error) => {
          // Error toast is handled by the hook
          console.error("Failed to create class:", error)
        },
      },
    )
  }

  return (
    <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-sans">Create Class</CardTitle>
        </div>
        <CardDescription>Add new class to the system</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="class-name" className="text-sm font-medium">
            Class Name *
          </Label>
          <Input
            id="class-name"
            placeholder="e.g., Grade 10, Class A"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="bg-background border-border"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="class-description" className="text-sm font-medium">
            Description
          </Label>
          <Textarea
            id="class-description"
            placeholder="Brief description of the class (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-background border-border resize-none"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="academic-session" className="text-sm font-medium">
            Academic Session *
          </Label>
          <Select value={academicYear} onValueChange={setAcademicYear} disabled={isFetchingSessions || sessions.length === 0}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder={isFetchingSessions ? "Loading sessions..." : sessions.length === 0 ? "No sessions found" : "Select session"} />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleCreateClass}
          disabled={createClassMutation.isPending || !academicYear}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {createClassMutation.isPending ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Creating...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Class
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
