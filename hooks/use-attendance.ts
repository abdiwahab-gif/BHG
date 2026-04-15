import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { 
  AttendanceSession, 
  AttendanceFilters, 
  CreateAttendanceRequest,
  StudentAttendance 
} from "@/types/attendance"

export function useAttendanceSessions(filters?: AttendanceFilters) {
  return useQuery({
    queryKey: ["attendance-sessions", filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      if (filters?.courseId) params.append("courseId", filters.courseId)
      if (filters?.classId) params.append("classId", filters.classId)
      if (filters?.startDate) params.append("startDate", filters.startDate)
      if (filters?.endDate) params.append("endDate", filters.endDate)
      if (filters?.page) params.append("page", filters.page.toString())
      if (filters?.limit) params.append("limit", filters.limit.toString())

      const response = await fetch(`/api/attendance?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch attendance sessions")
      }
      return response.json()
    },
  })
}

export function useStudentsForAttendance(classId?: string) {
  return useQuery({
    queryKey: ["attendance-students", classId],
    queryFn: async () => {
      if (!classId) return { students: [], total: 0 }
      
      const response = await fetch(`/api/attendance/students?classId=${classId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch students")
      }
      return response.json()
    },
    enabled: !!classId,
  })
}

export function useRecordAttendance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateAttendanceRequest) => {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to record attendance")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-sessions"] })
    },
  })
}

export function useAttendanceFilters() {
  const [filters, setFilters] = useState<AttendanceFilters>({
    page: 1,
    limit: 10,
  })

  const updateFilters = (newFilters: Partial<AttendanceFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({ page: 1, limit: 10 })
  }

  return {
    filters,
    updateFilters,
    clearFilters,
    setFilters,
  }
}

export function useAttendanceStats(courseId?: string, classId?: string) {
  return useQuery({
    queryKey: ["attendance-stats", courseId, classId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (courseId) params.append("courseId", courseId)
      if (classId) params.append("classId", classId)

      const response = await fetch(`/api/attendance/stats?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch attendance statistics")
      }
      return response.json()
    },
    enabled: !!(courseId || classId),
  })
}