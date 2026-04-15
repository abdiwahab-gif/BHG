"use client"

import { useState, useEffect } from "react"
import {
  type Student,
  type StudentFilters,
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  deleteStudents,
} from "@/lib/api/students"
import { useToast } from "@/hooks/use-toast"

// Hook for managing students list with filtering and pagination
export function useStudents(initialFilters: StudentFilters = {}) {
  const [students, setStudents] = useState<Student[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [filters, setFilters] = useState<StudentFilters>(initialFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch students data
  const fetchStudents = async (newFilters?: StudentFilters) => {
    try {
      setLoading(true)
      setError(null)
      const filtersToUse = newFilters || filters
      const response = await getStudents(filtersToUse)
      setStudents(response.students)
      setPagination(response.pagination)
      setFilters(response.filters)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch students"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Update filters and refetch
  const updateFilters = (newFilters: Partial<StudentFilters>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 } // Reset to page 1 when filtering
    fetchStudents(updatedFilters)
  }

  // Change page
  const changePage = (page: number) => {
    const updatedFilters = { ...filters, page }
    fetchStudents(updatedFilters)
  }

  // Refresh data
  const refresh = () => {
    fetchStudents()
  }

  // Delete student and refresh list
  const handleDeleteStudent = async (id: string) => {
    try {
      await deleteStudent(id)
      toast({
        title: "Success",
        description: "Student deleted successfully",
      })
      refresh()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete student"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  // Delete multiple students and refresh list
  const handleDeleteStudents = async (ids: string[]) => {
    try {
      const response = await deleteStudents(ids)
      toast({
        title: "Success",
        description: `${response.deletedCount} students deleted successfully`,
      })
      refresh()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete students"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchStudents()
  }, [])

  return {
    students,
    pagination,
    filters,
    loading,
    error,
    updateFilters,
    changePage,
    refresh,
    handleDeleteStudent,
    handleDeleteStudents,
  }
}

// Hook for managing a single student
export function useStudent(id: string) {
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch student data
  const fetchStudent = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getStudent(id)
      setStudent(response.student)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch student"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Update student
  const handleUpdateStudent = async (data: Partial<Student>) => {
    try {
      const response = await updateStudent(id, data)
      setStudent(response.student)
      toast({
        title: "Success",
        description: "Student updated successfully",
      })
      return response.student
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update student"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }

  // Refresh data
  const refresh = () => {
    fetchStudent()
  }

  // Initial fetch
  useEffect(() => {
    if (id) {
      fetchStudent()
    }
  }, [id])

  return {
    student,
    loading,
    error,
    handleUpdateStudent,
    refresh,
  }
}

// Hook for creating a new student
export function useCreateStudent() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleCreateStudent = async (
    data: Omit<Student, "id" | "studentId" | "status" | "enrollmentDate" | "createdAt" | "updatedAt">,
  ) => {
    try {
      setLoading(true)
      const response = await createStudent(data)
      toast({
        title: "Success",
        description: "Student created successfully",
      })
      return response.student
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create student"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    handleCreateStudent,
    loading,
  }
}
