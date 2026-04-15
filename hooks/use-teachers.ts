"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { teachersApi, type TeacherFilters, type CreateTeacherData } from "@/lib/api/teachers"
import { useToast } from "@/hooks/use-toast"

// Query keys
export const teacherKeys = {
  all: ["teachers"] as const,
  lists: () => [...teacherKeys.all, "list"] as const,
  list: (filters: TeacherFilters) => [...teacherKeys.lists(), filters] as const,
  details: () => [...teacherKeys.all, "detail"] as const,
  detail: (id: string) => [...teacherKeys.details(), id] as const,
}

// Hook to get teachers list with filters
export function useTeachers(filters: TeacherFilters = {}) {
  return useQuery({
    queryKey: teacherKeys.list(filters),
    queryFn: () => teachersApi.getTeachers(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook to get single teacher
export function useTeacher(id: string) {
  return useQuery({
    queryKey: teacherKeys.detail(id),
    queryFn: () => teachersApi.getTeacher(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook to create teacher
export function useCreateTeacher() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: teachersApi.createTeacher,
    onSuccess: (data) => {
      // Invalidate and refetch teachers list
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() })

      toast({
        title: "Success",
        description: data.message || "Teacher created successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create teacher",
        variant: "destructive",
      })
    },
  })
}

// Hook to update teacher
export function useUpdateTeacher() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTeacherData> }) => teachersApi.updateTeacher(id, data),
    onSuccess: (data, variables) => {
      // Invalidate and refetch teachers list
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() })
      // Invalidate and refetch specific teacher
      queryClient.invalidateQueries({ queryKey: teacherKeys.detail(variables.id) })

      toast({
        title: "Success",
        description: data.message || "Teacher updated successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update teacher",
        variant: "destructive",
      })
    },
  })
}

// Hook to delete teacher
export function useDeleteTeacher() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: teachersApi.deleteTeacher,
    onSuccess: (data) => {
      // Invalidate and refetch teachers list
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() })

      toast({
        title: "Success",
        description: data.message || "Teacher deleted successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete teacher",
        variant: "destructive",
      })
    },
  })
}
