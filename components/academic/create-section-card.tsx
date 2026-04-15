"use client"

import { useEffect, useState } from "react"
import { Building, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

type ClassItem = {
  id: string
  name: string
}

export function CreateSectionCard() {
  const [sectionName, setSectionName] = useState("")
  const [roomNumber, setRoomNumber] = useState("")
  const [assignedClass, setAssignedClass] = useState("")
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [isFetching, setIsFetching] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const loadClasses = async () => {
    const res = await fetch("/api/classes")
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.message || "Failed to fetch classes")

    const list = Array.isArray(data?.data) ? data.data : []
    setClasses(list)
  }

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsFetching(true)
      try {
        await loadClasses()
      } catch (error) {
        if (!isMounted) return
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load classes",
          variant: "destructive",
        })
      } finally {
        if (isMounted) setIsFetching(false)
      }
    }

    const onClassesChanged = () => {
      loadClasses().catch(() => null)
    }

    load()
    window.addEventListener("classes:changed", onClassesChanged)

    return () => {
      isMounted = false
      window.removeEventListener("classes:changed", onClassesChanged)
    }
  }, [toast])

  const handleCreateSection = async () => {
    if (!sectionName.trim() || !roomNumber.trim() || !assignedClass) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const selectedClass = classes.find((c) => c.id === assignedClass)

      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sectionName.trim(),
          roomNumber: roomNumber.trim(),
          classId: assignedClass,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        toast({
          title: "Error",
          description: data?.message || "Failed to create section",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: `Section "${sectionName.trim()}" created and assigned to ${selectedClass?.name || "class"}`,
      })
      setSectionName("")
      setRoomNumber("")
      setAssignedClass("")
      window.dispatchEvent(new Event("sections:changed"))
      window.dispatchEvent(new Event("classes:changed"))
    } catch {
      toast({
        title: "Error",
        description: "Failed to create section",
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
          <Building className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-sans">Create Section</CardTitle>
        </div>
        <CardDescription>Add sections and assign to classes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="section-name" className="text-sm font-medium">
            Section Name
          </Label>
          <Input
            id="section-name"
            placeholder="e.g., Section A, Morning Batch"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            className="bg-background border-border"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="room-number" className="text-sm font-medium">
            Room Number
          </Label>
          <Input
            id="room-number"
            placeholder="e.g., Room 101, Lab A"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            className="bg-background border-border"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="class-select" className="text-sm font-medium">
            Assign Section to Class
          </Label>
          <Select value={assignedClass} onValueChange={setAssignedClass}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((classItem) => (
                <SelectItem key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleCreateSection}
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
              Creating...
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
