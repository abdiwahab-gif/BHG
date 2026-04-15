import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/hooks/use-toast"

export interface GPACalculationRequest {
  studentId: string
  sessionId: string
  semesterId?: string
  includeAttendance?: boolean
  gradingSystemId?: string
}

export interface CreateGradingSystemData {
  name: string
  type: "letter" | "percentage" | "gpa_4" | "gpa_5"
  departmentId?: string
  programId?: string
}

export interface CreateGradeMappingData {
  minScore: number
  maxScore: number
  letterGrade?: string
  gradePoint: number
  description: string
  isPassingGrade: boolean
}

// Calculate GPA
export function useCalculateGPA() {
  return useMutation({
    mutationFn: async (data: GPACalculationRequest) => {
      const response = await fetch("/api/gpa/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to calculate GPA")
      }

      return response.json()
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

// Fetch grading systems
export function useGradingSystems(filters: { departmentId?: string; programId?: string } = {}) {
  return useQuery({
    queryKey: ["grading-systems", filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      const response = await fetch(`/api/grading-systems?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch grading systems")
      }
      return response.json()
    },
  })
}

// Create grading system
export function useCreateGradingSystem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateGradingSystemData) => {
      const response = await fetch("/api/grading-systems", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create grading system")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grading-systems"] })
      toast({
        title: "Success",
        description: "Grading system created successfully",
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

// Fetch grade mappings for a grading system
export function useGradeMappings(gradingSystemId: string) {
  return useQuery({
    queryKey: ["grade-mappings", gradingSystemId],
    queryFn: async () => {
      const response = await fetch(`/api/grading-systems/${gradingSystemId}/mappings`)
      if (!response.ok) {
        throw new Error("Failed to fetch grade mappings")
      }
      return response.json()
    },
    enabled: !!gradingSystemId,
  })
}

// Create grade mapping
export function useCreateGradeMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ gradingSystemId, data }: { gradingSystemId: string; data: CreateGradeMappingData }) => {
      const response = await fetch(`/api/grading-systems/${gradingSystemId}/mappings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create grade mapping")
      }

      return response.json()
    },
    onSuccess: (_, { gradingSystemId }) => {
      queryClient.invalidateQueries({ queryKey: ["grade-mappings", gradingSystemId] })
      toast({
        title: "Success",
        description: "Grade mapping created successfully",
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

// Fetch student GPA history
export function useStudentGPAHistory(studentId: string, sessionId?: string) {
  return useQuery({
    queryKey: ["student-gpa-history", studentId, sessionId],
    queryFn: async () => {
      const params = new URLSearchParams({ studentId })
      if (sessionId) params.append("sessionId", sessionId)

      const response = await fetch(`/api/students/${studentId}/gpa-history?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch GPA history")
      }
      return response.json()
    },
    enabled: !!studentId,
  })
}
