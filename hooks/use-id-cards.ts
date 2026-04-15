import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { IDCard, IDCardFilters, CreateIDCardRequest, IDCardListResponse, PrintRequest } from "@/types/id-cards"

export function useIDCards(filters?: IDCardFilters) {
  return useQuery({
    queryKey: ["id-cards", filters],
    queryFn: async (): Promise<IDCardListResponse> => {
      const params = new URLSearchParams()
      
      if (filters?.type) params.append("type", filters.type)
      if (filters?.department) params.append("department", filters.department)
      if (filters?.status) params.append("status", filters.status)
      if (filters?.search) params.append("search", filters.search)
      if (filters?.page) params.append("page", filters.page.toString())
      if (filters?.limit) params.append("limit", filters.limit.toString())

      const response = await fetch(`/api/id-cards?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch ID cards")
      }
      return response.json()
    },
  })
}

export function useCreateIDCard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateIDCardRequest) => {
      const response = await fetch("/api/id-cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create ID card")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["id-cards"] })
    },
  })
}

export function useDeleteIDCard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/id-cards/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete ID card")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["id-cards"] })
    },
  })
}

export function usePrintIDCards() {
  return useMutation({
    mutationFn: async (printRequest: PrintRequest) => {
      const response = await fetch("/api/id-cards/print", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(printRequest),
      })

      if (!response.ok) {
        throw new Error("Failed to generate print")
      }

      // Return blob for PDF download
      return response.blob()
    },
  })
}

export function useIDCardFilters() {
  const [filters, setFilters] = useState<IDCardFilters>({
    type: "all",
    status: "all",
    page: 1,
    limit: 10,
  })

  const updateFilters = (newFilters: Partial<IDCardFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 })) // Reset to first page when filters change
  }

  const clearFilters = () => {
    setFilters({ type: "all", status: "all", page: 1, limit: 10 })
  }

  return {
    filters,
    updateFilters,
    clearFilters,
    setFilters,
  }
}