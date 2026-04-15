import { useQuery } from "@tanstack/react-query"

export interface AnalyticsFilters {
  sessionId?: string
  semesterId?: string
  courseId?: string
  departmentId?: string
  examTypeId?: string
  dateFrom?: Date
  dateTo?: Date
}

export function useExamResultsAnalytics(filters: AnalyticsFilters = {}) {
  return useQuery({
    queryKey: ["analytics", "exam-results", filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            params.append(key, value.toISOString())
          } else if (typeof value === "string" && value.trim() === "") {
            // skip
          } else {
            params.append(key, value.toString())
          }
        }
      })

      const response = await fetch(`/api/analytics/exam-results?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch analytics")
      }
      return response.json()
    },
  })
}

export function useStudentPerformanceAnalytics(studentId: string) {
  return useQuery({
    queryKey: ["analytics", "student-performance", studentId],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/student-performance/${studentId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch student performance")
      }
      return response.json()
    },
    enabled: !!studentId,
  })
}

export function useDepartmentAnalytics(departmentId: string, filters: AnalyticsFilters = {}) {
  return useExamResultsAnalytics({
    ...filters,
    departmentId,
  })
}

export function useCourseAnalytics(courseId: string, filters: AnalyticsFilters = {}) {
  return useExamResultsAnalytics({
    ...filters,
    courseId,
  })
}

export function useStudentPerformance(params: {
  studentId?: string
  sessionId: string
  semesterId: string
}) {
  return useQuery({
    queryKey: ["student-performance", params],
    queryFn: async () => {
      if (!params.studentId) return null

      const searchParams = new URLSearchParams({
        sessionId: params.sessionId,
        semesterId: params.semesterId,
      })

      const response = await fetch(`/api/analytics/student-performance/${params.studentId}?${searchParams}`)
      if (!response.ok) {
        throw new Error("Failed to fetch student performance")
      }
      return response.json()
    },
    enabled: !!params.studentId,
  })
}
