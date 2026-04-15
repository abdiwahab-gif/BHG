"use client"

import { useRef, useState } from "react"
import { Building2, Plus, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export function CreateFacultyCard() {
  const [facultyId, setFacultyId] = useState("")
  const [name, setName] = useState("")
  const [department, setDepartment] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()

  const handleCreateFaculty = async () => {
    if (!facultyId.trim() || !name.trim()) {
      toast({
        title: "Error",
        description: "Please provide Faculty ID and Faculty Name",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/faculties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facultyId: facultyId.trim(),
          name: name.trim(),
          department: department.trim(),
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast({
          title: "Error",
          description: data?.message || "Failed to create faculty",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: data?.message || "Faculty created successfully",
      })

      setFacultyId("")
      setName("")
      setDepartment("")
      window.dispatchEvent(new Event("faculties:changed"))
    } catch {
      toast({
        title: "Error",
        description: "Failed to create faculty",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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

      const res = await fetch("/api/faculties/bulk-import", {
        method: "POST",
        body: fd,
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast({
          title: "Error",
          description: data?.error || "Failed to import faculties",
          variant: "destructive",
        })
        return
      }

      const success = Number(data?.result?.success || 0)
      const failed = Number(data?.result?.failed || 0)

      toast({
        title: "Import complete",
        description: `Imported: ${success}, Failed: ${failed}`,
      })

      window.dispatchEvent(new Event("faculties:changed"))
    } catch {
      toast({
        title: "Error",
        description: "Failed to import faculties",
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
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-sans">Create Faculty</CardTitle>
        </div>
        <CardDescription>Add faculties for predefined academic structure</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="faculty-id" className="text-sm font-medium">
            Faculty ID
          </Label>
          <Input
            id="faculty-id"
            placeholder="e.g., SCI, ENG"
            value={facultyId}
            onChange={(e) => setFacultyId(e.target.value)}
            className="bg-background border-border"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="faculty-name" className="text-sm font-medium">
            Faculty Name
          </Label>
          <Input
            id="faculty-name"
            placeholder="e.g., Faculty of Science"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-background border-border"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="faculty-department" className="text-sm font-medium">
            Department
          </Label>
          <Input
            id="faculty-department"
            placeholder="e.g., Computer Science"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="bg-background border-border"
          />
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
            onClick={handleCreateFaculty}
            disabled={isLoading || isImporting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading ? (
              <span>Creating...</span>
            ) : (
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create
              </span>
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
