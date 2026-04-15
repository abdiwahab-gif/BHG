"use client"

import { useQuery } from "@tanstack/react-query"

export interface Faculty {
  id: string
  facultyId: string
  name: string
  department?: string | null
  createdAt?: string
  updatedAt?: string
}

type FacultiesApiResponse = {
  success: boolean
  data: Faculty[]
  message?: string
}

async function fetchFaculties(): Promise<Faculty[]> {
  const response = await fetch("/api/faculties")
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || body?.error || "Failed to fetch faculties")
  }

  const json = (await response.json()) as FacultiesApiResponse
  return json.data || []
}

export function useFaculties() {
  return useQuery({
    queryKey: ["faculties"],
    queryFn: fetchFaculties,
    staleTime: 5 * 60 * 1000,
  })
}
