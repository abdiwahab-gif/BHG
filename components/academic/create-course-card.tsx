"use client"

import { useEffect, useRef, useState } from "react"
import { BookOpen, Plus, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useFaculties } from "@/hooks/use-faculties"

export function CreateCourseCard() {
  const [courseName, setCourseName] = useState("")
  const [courseType, setCourseType] = useState("")
  const [courseCode, setCourseCode] = useState("")
  const [courseCredits, setCourseCredits] = useState("")
  const [selectedFacultyId, setSelectedFacultyId] = useState("")
  const [facultyName, setFacultyName] = useState("")
  const [department, setDepartment] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()
  const { data: faculties = [], isLoading: isLoadingFaculties, refetch: refetchFaculties } = useFaculties()

  useEffect(() => {
    const onFacultiesChanged = () => {
      refetchFaculties().catch(() => null)
    }

    window.addEventListener("faculties:changed", onFacultiesChanged)
    return () => window.removeEventListener("faculties:changed", onFacultiesChanged)
  }, [refetchFaculties])

  const handleCreateCourse = async () => {
    if (!courseName.trim() || !courseType || !courseCode.trim() || !courseCredits.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    const credits = Number(courseCredits)
    if (!Number.isFinite(credits) || credits <= 0 || credits > 50) {
      toast({
        title: "Error",
        description: "Course credits must be a number between 0 and 50",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: courseName.trim(),
          type: courseType,
          code: courseCode.trim(),
          credits,
          faculty: facultyName.trim(),
          department: department.trim(),
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        toast({
          title: "Error",
          description: data?.message || "Failed to create course",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: data?.message || `${courseType} course "${courseName.trim()}" created successfully`,
      })
      setCourseName("")
      setCourseType("")
      setCourseCode("")
      setCourseCredits("")
      setSelectedFacultyId("")
      setFacultyName("")
      setDepartment("")
      window.dispatchEvent(new Event("courses:changed"))
    } catch {
      toast({
        title: "Error",
        description: "Failed to create course",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFacultySelect = (facultyId: string) => {
    setSelectedFacultyId(facultyId)
    const f = faculties.find((x) => x.id === facultyId)
    if (f) {
      setFacultyName(String(f.name || ""))
      setDepartment(String(f.department || ""))
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (file: File | null) => {
    if (!file) return

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({
        title: "Error",
        description: "Please select a .csv file",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)
    try {
      const fd = new FormData()
      fd.append("file", file)

      const res = await fetch("/api/courses/bulk-import", {
        method: "POST",
        body: fd,
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        toast({
          title: "Error",
          description: data?.error || "Failed to import courses",
          variant: "destructive",
        })
        return
      }

      const inserted = Number(data?.result?.inserted || 0)
      const updated = Number(data?.result?.updated || 0)
      const failed = Number(data?.result?.failed || 0)

      toast({
        title: "Import complete",
        description: `Inserted: ${inserted}, Updated: ${updated}, Failed: ${failed}`,
      })

      window.dispatchEvent(new Event("courses:changed"))
    } catch {
      toast({
        title: "Error",
        description: "Failed to import courses",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <Card className="border-border shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-sans">Create Course</CardTitle>
        </div>
        <CardDescription>Add courses to curriculum</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="course-name" className="text-sm font-medium">
            Course Name
          </Label>
          <Input
            id="course-name"
            placeholder="e.g., Mathematics, Physics"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            className="bg-background border-border"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="course-code" className="text-sm font-medium">
              Course Code
            </Label>
            <Input
              id="course-code"
              placeholder="e.g., MTH101"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-credits" className="text-sm font-medium">
              Course Credits
            </Label>
            <Input
              id="course-credits"
              type="number"
              inputMode="decimal"
              placeholder="e.g., 3"
              value={courseCredits}
              onChange={(e) => setCourseCredits(e.target.value)}
              className="bg-background border-border"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="course-type" className="text-sm font-medium">
            Course Type
          </Label>
          <Select value={courseType} onValueChange={setCourseType}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Select course type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Core">Core</SelectItem>
              <SelectItem value="Elective">Elective</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="course-faculty" className="text-sm font-medium">
            Faculty (Optional)
          </Label>
          <Select value={selectedFacultyId} onValueChange={handleFacultySelect}>
            <SelectTrigger className="bg-background border-border w-full">
              <SelectValue placeholder={isLoadingFaculties ? "Loading faculties..." : "Select faculty"} />
            </SelectTrigger>
            <SelectContent>
              {faculties.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No faculties found</div>
              ) : (
                faculties.map((f) => (
                  <SelectItem key={f.id} value={f.id} className="whitespace-normal items-start">
                    <div className="flex flex-col gap-0.5">
                      <div className="font-medium break-words">{f.name} ({f.facultyId})</div>
                      <div className="text-xs text-muted-foreground break-words">{String(f.department || "")}</div>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="course-faculty-name" className="text-sm font-medium">
              Faculty Name
            </Label>
            <Input
              id="course-faculty-name"
              placeholder="e.g., Faculty of Science"
              value={facultyName}
              onChange={(e) => setFacultyName(e.target.value)}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-department" className="text-sm font-medium">
              Department
            </Label>
            <Input
              id="course-department"
              placeholder="e.g., Computer Science"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="bg-background border-border"
            />
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            onClick={handleCreateCourse}
            disabled={isLoading || isImporting}
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

          <Button
            type="button"
            variant="outline"
            onClick={handleImportClick}
            disabled={isLoading || isImporting}
            className="w-full"
          >
            {isImporting ? (
              <span>Importing...</span>
            ) : (
              <span className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import CSV
              </span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
