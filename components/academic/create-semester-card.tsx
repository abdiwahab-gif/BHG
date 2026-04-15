"use client"

import { useState } from "react"
import { Settings, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export function CreateSemesterCard() {
  const [semesterName, setSemesterName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleCreateSemester = async () => {
    if (!semesterName.trim() || !startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    if (new Date(startDate) >= new Date(endDate)) {
      toast({
        title: "Error",
        description: "End date must be after start date",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/semesters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: semesterName.trim(),
          startDate,
          endDate,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        toast({
          title: "Error",
          description: data?.message || "Failed to create semester",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: data?.message || `Semester "${semesterName.trim()}" created successfully`,
      })
      setSemesterName("")
      setStartDate("")
      setEndDate("")
    } catch {
      toast({
        title: "Error",
        description: "Failed to create semester",
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
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-sans">Create Semester</CardTitle>
        </div>
        <CardDescription>Add semester to current session</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="semester-name" className="text-sm font-medium">
            Semester Name
          </Label>
          <Input
            id="semester-name"
            placeholder="e.g., Fall 2025"
            value={semesterName}
            onChange={(e) => setSemesterName(e.target.value)}
            className="bg-background border-border"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="start-date" className="text-sm font-medium">
              Start Date
            </Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date" className="text-sm font-medium">
              End Date
            </Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-background border-border"
            />
          </div>
        </div>
        <Button
          onClick={handleCreateSemester}
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
