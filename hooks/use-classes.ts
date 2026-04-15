"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"

// Types
export interface ClassSection {
  id: string
  name: string
  roomNumber: string
  capacity: number
  currentStudents: number
}

export interface ClassCourse {
  id: string
  name: string
  type: "General" | "Elective"
  credits: number
  teacherId?: string
  teacherName?: string
}

export interface Class {
  id: string
  name: string
  description: string
  academicYear: string
  sections: ClassSection[]
  courses: ClassCourse[]
  createdAt: string
  updatedAt: string
}

// API functions
const fetchClasses = async (academicYear?: string): Promise<Class[]> => {
  const params = new URLSearchParams()
  if (academicYear) params.append("academicYear", academicYear)

  const response = await fetch(`/api/classes?${params}`)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || body?.error || "Failed to fetch classes")
  }

  const data = await response.json()
  return data.data
}

const fetchClass = async (id: string): Promise<Class> => {
  const response = await fetch(`/api/classes/${id}`)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || body?.error || "Failed to fetch class")
  }

  const data = await response.json()
  return data.data
}

const createClass = async (classData: Partial<Class>): Promise<Class> => {
  const response = await fetch("/api/classes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(classData),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || body?.error || "Failed to create class")
  }

  const data = await response.json()
  return data.data
}

const updateClass = async ({ id, ...classData }: Partial<Class> & { id: string }): Promise<Class> => {
  const response = await fetch(`/api/classes/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(classData),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || body?.error || "Failed to update class")
  }

  const data = await response.json()
  return data.data
}

const deleteClass = async (id: string): Promise<void> => {
  const response = await fetch(`/api/classes/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || body?.error || "Failed to delete class")
  }
}

const fetchClassCourses = async (classId: string): Promise<ClassCourse[]> => {
  const response = await fetch(`/api/classes/${classId}/courses`)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || body?.error || "Failed to fetch courses")
  }

  const data = await response.json()
  return data.data
}

// Hooks
export const useClasses = (academicYear?: string) => {
  return useQuery({
    queryKey: ["classes", academicYear],
    queryFn: () => fetchClasses(academicYear),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useClass = (id: string) => {
  return useQuery({
    queryKey: ["classes", id],
    queryFn: () => fetchClass(id),
    enabled: !!id,
  })
}

export const useClassCourses = (classId: string) => {
  return useQuery({
    queryKey: ["classes", classId, "courses"],
    queryFn: () => fetchClassCourses(classId),
    enabled: !!classId,
  })
}

export const useCreateClass = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: createClass,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] })
      queryClient.invalidateQueries({ queryKey: ["academic"] })

      toast({
        title: "Success",
        description: `Class "${data.name}" created successfully`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create class",
        variant: "destructive",
      })
    },
  })
}

export const useUpdateClass = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: updateClass,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] })
      queryClient.invalidateQueries({ queryKey: ["classes", data.id] })
      queryClient.invalidateQueries({ queryKey: ["academic"] })

      toast({
        title: "Success",
        description: "Class updated successfully",
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

export const useDeleteClass = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: deleteClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] })
      queryClient.invalidateQueries({ queryKey: ["academic"] })

      toast({
        title: "Success",
        description: "Class deleted successfully",
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

export const useClassesSync = () => {
  const queryClient = useQueryClient()

  const syncData = () => {
    // Invalidate all related queries to ensure data consistency
    queryClient.invalidateQueries({ queryKey: ["classes"] })
    queryClient.invalidateQueries({ queryKey: ["academic"] })
  }

  return { syncData }
}
