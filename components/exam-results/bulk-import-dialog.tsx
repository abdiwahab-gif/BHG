"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { getAuditHeaders } from "@/lib/client-audit"
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Download } from "lucide-react"

interface BulkImportDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface ImportResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    field: string
    message: string
    value: string
  }>
}

export function BulkImportDialog({ isOpen, onOpenChange, onSuccess }: BulkImportDialogProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImportResult(null)
      setPreviewData([])

      parseFilePreview(file)
    }
  }

  const parseFilePreview = async (file: File) => {
    try {
      const text = await file.text()
      const lines = text.split("\n").slice(0, 6) // Preview first 5 rows + header
      const preview = lines.map((line) => line.split(","))
      setPreviewData(preview)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse file preview",
        variant: "destructive",
      })
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch("/api/exam-results/bulk-import", {
        method: "POST",
        headers: {
          ...getAuditHeaders(),
        },
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const result: ImportResult = await response.json()
      setImportResult(result)

      if (result.success > 0) {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${result.success} exam results`,
        })
        onSuccess?.()
      }

      if (result.failed > 0) {
        toast({
          title: "Import Issues",
          description: `${result.failed} records failed to import. Check the errors tab for details.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload and process the file",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent = `studentId,studentNumber,gender,courseId,courseCode,courseCredits,faculty,department,examTypeCode,sessionId,semesterId,score,maxScore,comments
<student-uuid>,2026-10-A-001,male,<course-uuid>,MTH101,3,Science,Mathematics,MID,<session-uuid>,<semester-uuid>,14,30,Midterm score
<student-uuid>,2026-10-A-001,male,<course-uuid>,MTH101,3,Science,Mathematics,FINAL,<session-uuid>,<semester-uuid>,57,70,Final score`

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "exam-results-template.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Exam Results
          </DialogTitle>
          <DialogDescription>Upload exam results in bulk using Excel or CSV files</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="preview" disabled={!selectedFile}>
              Preview
            </TabsTrigger>
            <TabsTrigger value="results" disabled={!importResult}>
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">File Upload</CardTitle>
                <CardDescription>Select an Excel (.xlsx) or CSV (.csv) file containing exam results</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileSpreadsheet className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">Excel (.xlsx) or CSV (.csv) files only</p>
                    </div>
                    <input
                      id="file-upload"
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".xlsx,.csv"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>

                {selectedFile && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Selected file: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between items-center">
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>

                  <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
                    {isUploading ? "Processing..." : "Upload & Import"}
                  </Button>
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-sm text-gray-500 text-center">Processing file... {uploadProgress}%</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">File Preview</CardTitle>
                <CardDescription>Preview of the first 5 rows from your file</CardDescription>
              </CardHeader>
              <CardContent>
                {previewData.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          {previewData[0]?.map((header, index) => (
                            <th key={index} className="border border-gray-300 px-2 py-1 text-left text-sm font-medium">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.slice(1).map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="border border-gray-300 px-2 py-1 text-sm">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {importResult && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-amber-600 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Successful Imports
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-amber-600">{importResult.success}</div>
                      <p className="text-sm text-gray-500">Records imported successfully</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-red-600 flex items-center gap-2">
                        <XCircle className="h-5 w-5" />
                        Failed Imports
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-600">{importResult.failed}</div>
                      <p className="text-sm text-gray-500">Records that failed to import</p>
                    </CardContent>
                  </Card>
                </div>

                {importResult.errors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        Import Errors
                      </CardTitle>
                      <CardDescription>Details of records that failed to import</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {importResult.errors.map((error, index) => (
                          <Alert key={index} variant="destructive">
                            <AlertDescription>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">Row {error.row}</Badge>
                                <Badge variant="outline">{error.field}</Badge>
                              </div>
                              <strong>Error:</strong> {error.message}
                              <br />
                              <strong>Value:</strong> "{error.value}"
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
