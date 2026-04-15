import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Syllabus, SyllabusFilters, CreateSyllabusRequest, SyllabusListResponse } from "@/types/syllabus"

export function useSyllabi(filters?: SyllabusFilters) {
  return useQuery({
    queryKey: ["syllabi", filters],
    queryFn: async (): Promise<SyllabusListResponse> => {
      const params = new URLSearchParams()
      
      if (filters?.faculty) params.append("faculty", filters.faculty)
      if (filters?.classId) params.append("classId", filters.classId)
      if (filters?.courseId) params.append("courseId", filters.courseId)
      if (filters?.search) params.append("search", filters.search)
      if (filters?.page) params.append("page", filters.page.toString())
      if (filters?.limit) params.append("limit", filters.limit.toString())

      const response = await fetch(`/api/syllabus?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch syllabi")
      }
      return response.json()
    },
  })
}

export function useCreateSyllabus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateSyllabusRequest) => {
      const formData = new FormData()
      formData.append("name", data.name)
      formData.append("faculty", data.faculty)
      formData.append("classId", data.classId)
      formData.append("courseId", data.courseId)
      formData.append("file", data.file)

      const response = await fetch("/api/syllabus", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create syllabus")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabi"] })
    },
  })
}

export function useDeleteSyllabus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/syllabus/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete syllabus")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabi"] })
    },
  })
}

export function useSyllabusFilters() {
  const [filters, setFilters] = useState<SyllabusFilters>({
    page: 1,
    limit: 10,
  })

  const updateFilters = (newFilters: Partial<SyllabusFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 })) // Reset to first page when filters change
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