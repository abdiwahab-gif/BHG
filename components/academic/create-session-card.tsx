"use client"

import { useState } from "react"
import { Calendar, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export function CreateSessionCard() {
  const [sessionName, setSessionName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleCreateSession = async () => {
    if (!sessionName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session name",
        variant: "destructive",
      })
      return
    }

    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select start and end dates",
        variant: "destructive",
      })
      return
    }

    if (new Date(endDate).getTime() <= new Date(startDate).getTime()) {
      toast({
        title: "Error",
        description: "End date must be after start date",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sessionName.trim(),
          startDate,
          endDate,
        }),
      })

      const data = await response.json().catch(() => null)

      if (response.ok) {
        toast({
          title: "Success",
          description: data?.message || `Session "${sessionName}" created successfully`,
        })
        setSessionName("")
        setStartDate("")
        setEndDate("")

        window.dispatchEvent(new Event("sessions:changed"))
      } else {
        toast({
          title: "Error",
          description: data?.message || "Failed to create session",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to create session",
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
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-sans">Create Session</CardTitle>
        </div>
        <CardDescription>Set up new academic session (only one per year)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="session-name" className="text-sm font-medium">
            Session Name
          </Label>
          <Input
            id="session-name"
            placeholder="e.g., 2025-2026"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="bg-background border-border"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="session-start" className="text-sm font-medium">
              Start Date
            </Label>
            <Input
              id="session-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-end" className="text-sm font-medium">
              End Date
            </Label>
            <Input
              id="session-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-background border-border"
            />
          </div>
        </div>
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
          Note: Latest session becomes active automatically
        </div>
        <Button
          onClick={handleCreateSession}
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Creating...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
