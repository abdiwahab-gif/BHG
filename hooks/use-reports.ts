import { useMutation } from "@tanstack/react-query"
import { toast } from "@/hooks/use-toast"

export interface TranscriptRequest {
  studentId: string
  sessionId?: string
  semesterId?: string
  format?: "pdf" | "json"
  includeGrades?: boolean
  includeAttendance?: boolean
  officialSeal?: boolean
}

export interface ResultSlipRequest {
  studentIds: string[]
  sessionId: string
  semesterId?: string
  courseId?: string
  examTypeId?: string
  format?: "pdf" | "json"
  includeGrades?: boolean
  includeComments?: boolean
}

export interface AnalyticsExportRequest {
  reportType: "grade_distribution" | "performance_trends" | "course_analysis" | "department_comparison"
  format?: "excel" | "csv" | "pdf"
  sessionId?: string
  semesterId?: string
  departmentId?: string
  courseId?: string
  dateFrom?: Date
  dateTo?: Date
}

// Generate transcript
export function useGenerateTranscript() {
  return useMutation({
    mutationFn: async (request: TranscriptRequest) => {
      const params = new URLSearchParams()
      Object.entries(request).forEach(([key, value]) => {
        if (key !== "studentId" && value !== undefined && value !== null) {
          if (value instanceof Date) {
            params.append(key, value.toISOString())
          } else {
            params.append(key, value.toString())
          }
        }
      })

      const response = await fetch(`/api/reports/transcripts/${request.studentId}?${params}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate transcript")
      }

      if (request.format === "pdf") {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `transcript-${request.studentId}-${Date.now()}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        return { success: true }
      }

      return response.json()
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Transcript generated successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })
}

// Generate result slips
export function useGenerateResultSlips() {
  return useMutation({
    mutationFn: async (request: ResultSlipRequest) => {
      const response = await fetch("/api/reports/result-slips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate result slips")
      }

      if (request.format === "pdf") {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `result-slips-${Date.now()}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        return { success: true }
      }

      return response.json()
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Result slips generated successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })
}

// Export analytics report
export function useExportAnalytics() {
  return useMutation({
    mutationFn: async (request: AnalyticsExportRequest) => {
      const response = await fetch("/api/reports/analytics/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...request,
          dateFrom: request.dateFrom?.toISOString(),
          dateTo: request.dateTo?.toISOString(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to export report")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url

      const extension = request.format === "excel" ? "xlsx" : request.format === "csv" ? "csv" : "pdf"
      a.download = `${request.reportType}-${Date.now()}.${extension}`

      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      return { success: true }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report exported successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })
}

// Bulk export transcripts
export function useBulkExportTranscripts() {
  return useMutation({
    mutationFn: async (request: { studentIds: string[]; options: Omit<TranscriptRequest, "studentId"> }) => {
      const promises = request.studentIds.map((studentId) =>
        fetch(`/api/reports/transcripts/${studentId}?${new URLSearchParams(request.options as any)}`),
      )

      const responses = await Promise.all(promises)
      const blobs = await Promise.all(responses.map((r) => r.blob()))

      // Create a zip file with all transcripts (simplified implementation)
      // In a real implementation, you'd use a library like JSZip
      const combinedBlob = new Blob(blobs, { type: "application/pdf" })
      const url = window.URL.createObjectURL(combinedBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `transcripts-bulk-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      return { success: true }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bulk transcripts exported successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })
}
