"use client"

import { useQuery } from "@tanstack/react-query"

export interface Course {
  id: string
  name: string
  type: string
  code?: string
  credits?: number | null
  faculty?: string
  department?: string
  createdAt?: string
  updatedAt?: string
}

type CoursesApiResponse = {
  success: boolean
  data: Course[]
  message?: string
}

export type UseCoursesOptions = {
  search?: string
  limit?: number
  faculty?: string
  department?: string
}

async function fetchCourses(options: UseCoursesOptions = {}): Promise<Course[]> {
  const params = new URLSearchParams()
  if (options.search?.trim()) params.set("search", options.search.trim())
  if (typeof options.limit === "number" && Number.isFinite(options.limit)) params.set("limit", String(options.limit))
  if (options.faculty?.trim()) params.set("faculty", options.faculty.trim())
  if (options.department?.trim()) params.set("department", options.department.trim())

  const qs = params.toString()
  const response = await fetch(qs ? `/api/courses?${qs}` : "/api/courses")
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || body?.error || "Failed to fetch courses")
  }

  const json = (await response.json()) as CoursesApiResponse
  return json.data || []
}

export function useCourses(options: UseCoursesOptions = {}) {
  return useQuery({
    queryKey: ["courses", options],
    queryFn: () => fetchCourses(options),
    staleTime: 5 * 60 * 1000,
  })
}
