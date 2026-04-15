"use client"

import { useEffect, useState } from "react"
import { UserCheck, Save, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"

export function AttendanceTypeCard() {
  const [attendanceType, setAttendanceType] = useState("")
  const [isFetching, setIsFetching] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsFetching(true)
      try {
        const res = await fetch("/api/attendance-type")
        const data = await res.json().catch(() => null)
        if (!res.ok) return

        const nextType = data?.data?.attendanceType
        if (isMounted && (nextType === "section" || nextType === "course")) {
          setAttendanceType(nextType)
        }
      } finally {
        if (isMounted) setIsFetching(false)
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [])

  const handleSaveAttendanceType = async () => {
    if (!attendanceType) {
      toast({
        title: "Error",
        description: "Please select an attendance type",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/attendance-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceType }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        toast({
          title: "Error",
          description: data?.message || "Failed to save attendance type",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: `Attendance type set to "${attendanceType === "section" ? "Attendance by Section" : "Attendance by Course"}"`,
      })
      window.dispatchEvent(new Event("attendanceType:changed"))
    } catch {
      toast({
        title: "Error",
        description: "Failed to save attendance type",
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
          <UserCheck className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-sans">Attendance Type</CardTitle>
        </div>
        <CardDescription>Configure how attendance is tracked</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Select Attendance Method</Label>
          <RadioGroup value={attendanceType} onValueChange={setAttendanceType}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="section" id="section" />
              <Label htmlFor="section" className="text-sm cursor-pointer">
                Attendance by Section
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="course" id="course" />
              <Label htmlFor="course" className="text-sm cursor-pointer">
                Attendance by Course
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-xs text-destructive">
            <strong>Warning:</strong> Do not change the attendance type in the middle of a semester.
          </p>
        </div>

        <Button
          onClick={handleSaveAttendanceType}
          disabled={isLoading || isFetching}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isFetching ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Loading...
            </div>
          ) : isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Saving...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
