import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/hooks/use-toast"
import { getAuditHeaders } from "@/lib/client-audit"

export interface ExamResultsFilter {
  studentId?: string
  courseId?: string
  faculty?: string
  department?: string
  examTypeId?: string
  sessionId?: string
  semesterId?: string
  search?: string
  status?: string
  grade?: string
  isPublished?: boolean
  page?: number
  limit?: number
}

export interface CreateExamResultData {
  studentId: string
  courseId: string
  examTypeId: string
  sessionId: string
  semesterId: string
  score: number
  maxScore: number
  comments?: string
}

export interface UpdateExamResultData {
  score?: number
  maxScore?: number
  comments?: string
  isPublished?: boolean
}

// Fetch exam results with filters
export function useExamResults(filters: ExamResultsFilter = {}) {
  return useQuery({
    queryKey: ["exam-results", filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null) return
        if (typeof value === "string" && value.trim() === "") return
        params.append(key, value.toString())
      })

      const response = await fetch(`/api/exam-results?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch exam results")
      }
      return response.json()
    },
  })
}

// Fetch single exam result
export function useExamResult(id: string) {
  return useQuery({
    queryKey: ["exam-result", id],
    queryFn: async () => {
      const response = await fetch(`/api/exam-results/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch exam result")
      }
      return response.json()
    },
    enabled: !!id,
  })
}

// Create exam result
export function useCreateExamResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateExamResultData) => {
      const response = await fetch("/api/exam-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuditHeaders(),
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create exam result")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-results"] })
      toast({
        title: "Success",
        description: "Exam result created successfully",
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

// Update exam result
export function useUpdateExamResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateExamResultData }) => {
      const response = await fetch(`/api/exam-results/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuditHeaders(),
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update exam result")
      }

      return response.json()
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["exam-results"] })
      queryClient.invalidateQueries({ queryKey: ["exam-result", id] })
      toast({
        title: "Success",
        description: "Exam result updated successfully",
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

// Delete exam result
export function useDeleteExamResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/exam-results/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete exam result")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-results"] })
      toast({
        title: "Success",
        description: "Exam result deleted successfully",
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

// Fetch exam types
export function useExamTypes() {
  return useQuery({
    queryKey: ["exam-types"],
    queryFn: async () => {
      const response = await fetch("/api/exam-types")
      if (!response.ok) {
        throw new Error("Failed to fetch exam types")
      }
      return response.json()
    },
  })
}

// Publish/unpublish exam results
export function usePublishExamResults() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, isPublished }: { ids: string[]; isPublished: boolean }) => {
      const promises = ids.map((id) =>
        fetch(`/api/exam-results/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuditHeaders(),
          },
          body: JSON.stringify({ isPublished }),
        }),
      )

      const responses = await Promise.all(promises)
      const results = await Promise.all(responses.map((r) => r.json()))

      return results
    },
    onSuccess: (_, { isPublished }) => {
      queryClient.invalidateQueries({ queryKey: ["exam-results"] })
      toast({
        title: "Success",
        description: `Exam results ${isPublished ? "published" : "unpublished"} successfully`,
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
