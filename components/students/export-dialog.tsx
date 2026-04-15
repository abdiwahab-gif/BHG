"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Download, FileSpreadsheet, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Student, StudentFilters } from "@/lib/api/students"

interface ExportDialogProps {
  students: Student[]
  filters?: StudentFilters
  onExport: (format: string, fields: string[], filters?: StudentFilters) => Promise<void>
}

const exportFields = [
  { id: "studentId", label: "Student ID", default: true },
  { id: "firstName", label: "First Name", default: true },
  { id: "lastName", label: "Last Name", default: true },
  { id: "email", label: "Email", default: true },
  { id: "phone", label: "Phone", default: true },
  { id: "class", label: "Class", default: true },
  { id: "section", label: "Section", default: true },
  { id: "gender", label: "Gender", default: false },
  { id: "bloodType", label: "Blood Type", default: false },
  { id: "nationality", label: "Nationality", default: false },
  { id: "religion", label: "Religion", default: false },
  { id: "address", label: "Address", default: false },
  { id: "city", label: "City", default: false },
  { id: "zip", label: "ZIP Code", default: false },
  { id: "fatherName", label: "Father's Name", default: false },
  { id: "motherName", label: "Mother's Name", default: false },
  { id: "fatherPhone", label: "Father's Phone", default: false },
  { id: "motherPhone", label: "Mother's Phone", default: false },
  { id: "emergencyContact", label: "Emergency Contact", default: false },
  { id: "status", label: "Status", default: true },
  { id: "enrollmentDate", label: "Enrollment Date", default: false },
]

export function ExportDialog({ students, filters, onExport }: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState("csv")
  const [selectedFields, setSelectedFields] = useState<string[]>(
    exportFields.filter((field) => field.default).map((field) => field.id),
  )
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const handleFieldToggle = (fieldId: string, checked: boolean) => {
    if (checked) {
      setSelectedFields((prev) => [...prev, fieldId])
    } else {
      setSelectedFields((prev) => prev.filter((id) => id !== fieldId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFields(exportFields.map((field) => field.id))
    } else {
      setSelectedFields([])
    }
  }

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one field to export",
        variant: "destructive",
      })
      return
    }

    setIsExporting(true)
    try {
      await onExport(format, selectedFields, filters)
      setOpen(false)
      toast({
        title: "Success",
        description: `Students data exported successfully as ${format.toUpperCase()}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export students data",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-transparent">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Students Data</DialogTitle>
          <DialogDescription>Export {students.length} students data in your preferred format.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV (Excel Compatible)
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    JSON
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Field Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Fields to Export</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedFields.length === exportFields.length}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm">
                  Select All
                </Label>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-3">
              {exportFields.map((field) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={selectedFields.includes(field.id)}
                    onCheckedChange={(checked) => handleFieldToggle(field.id, checked as boolean)}
                  />
                  <Label htmlFor={field.id} className="text-sm">
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || selectedFields.length === 0}>
            {isExporting ? "Exporting..." : "Export Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
