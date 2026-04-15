import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { 
  Requisition, 
  RequisitionFilters, 
  RequisitionListResponse,
  CreateRequisitionRequest,
  ReviewRequisitionRequest,
  PurchaseOrder,
  PurchaseOrderFilters,
  PurchaseOrderListResponse,
  CreatePurchaseOrderRequest,
  BudgetApprovalRequest,
  ProcurementStats
} from "@/types/procurement"

// Requisitions hooks
export function useRequisitions(filters?: RequisitionFilters) {
  return useQuery({
    queryKey: ["requisitions", filters],
    queryFn: async (): Promise<RequisitionListResponse> => {
      const params = new URLSearchParams()
      
      if (filters?.status) params.append("status", filters.status)
      if (filters?.department) params.append("department", filters.department)
      if (filters?.priority) params.append("priority", filters.priority)
      if (filters?.search) params.append("search", filters.search)
      if (filters?.page) params.append("page", filters.page.toString())
      if (filters?.limit) params.append("limit", filters.limit.toString())

      const response = await fetch(`/api/procurement/requisitions?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch requisitions")
      }
      return response.json()
    },
  })
}

export function useRequisition(id: string) {
  return useQuery({
    queryKey: ["requisition", id],
    queryFn: async (): Promise<Requisition> => {
      const response = await fetch(`/api/procurement/requisitions/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch requisition")
      }
      return response.json()
    },
    enabled: !!id,
  })
}

export function useCreateRequisition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateRequisitionRequest) => {
      const response = await fetch("/api/procurement/requisitions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create requisition")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requisitions"] })
      queryClient.invalidateQueries({ queryKey: ["procurement-stats"] })
    },
  })
}

export function useReviewRequisition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: ReviewRequisitionRequest & { id: string }) => {
      const response = await fetch(`/api/procurement/requisitions/${id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to review requisition")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requisitions"] })
      queryClient.invalidateQueries({ queryKey: ["requisition"] })
      queryClient.invalidateQueries({ queryKey: ["procurement-stats"] })
    },
  })
}

export function useDeleteRequisition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/procurement/requisitions/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete requisition")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requisitions"] })
      queryClient.invalidateQueries({ queryKey: ["procurement-stats"] })
    },
  })
}

// Purchase Orders hooks
export function usePurchaseOrders(filters?: PurchaseOrderFilters) {
  return useQuery({
    queryKey: ["purchase-orders", filters],
    queryFn: async (): Promise<PurchaseOrderListResponse> => {
      const params = new URLSearchParams()
      
      if (filters?.status) params.append("status", filters.status)
      if (filters?.vendor) params.append("vendor", filters.vendor)
      if (filters?.paymentStatus) params.append("paymentStatus", filters.paymentStatus)
      if (filters?.search) params.append("search", filters.search)
      if (filters?.page) params.append("page", filters.page.toString())
      if (filters?.limit) params.append("limit", filters.limit.toString())

      const response = await fetch(`/api/procurement/purchase-orders?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch purchase orders")
      }
      return response.json()
    },
  })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePurchaseOrderRequest) => {
      const response = await fetch("/api/procurement/purchase-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create purchase order")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      queryClient.invalidateQueries({ queryKey: ["procurement-stats"] })
    },
  })
}

export function useBudgetApproval() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: BudgetApprovalRequest & { id: string }) => {
      const response = await fetch(`/api/procurement/purchase-orders/${id}/budget-approval`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to process budget approval")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      queryClient.invalidateQueries({ queryKey: ["procurement-stats"] })
    },
  })
}

// Dashboard hooks
export function useProcurementStats() {
  return useQuery({
    queryKey: ["procurement-stats"],
    queryFn: async (): Promise<ProcurementStats> => {
      const response = await fetch("/api/procurement/dashboard")
      if (!response.ok) {
        throw new Error("Failed to fetch procurement statistics")
      }
      return response.json()
    },
  })
}

// Filter hooks
export function useRequisitionFilters() {
  const [filters, setFilters] = useState<RequisitionFilters>({
    status: "all",
    department: "all",
    priority: "all",
    search: "",
    page: 1,
    limit: 10,
  })

  const updateFilters = (newFilters: Partial<RequisitionFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({
      status: "all",
      department: "all",
      priority: "all",
      search: "",
      page: 1,
      limit: 10,
    })
  }

  return {
    filters,
    updateFilters,
    clearFilters,
    setFilters,
  }
}

export function usePurchaseOrderFilters() {
  const [filters, setFilters] = useState<PurchaseOrderFilters>({
    status: "all",
    vendor: "all",
    paymentStatus: "all",
    search: "",
    page: 1,
    limit: 10,
  })

  const updateFilters = (newFilters: Partial<PurchaseOrderFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({
      status: "all",
      vendor: "all", 
      paymentStatus: "all",
      search: "",
      page: 1,
      limit: 10,
    })
  }

  return {
    filters,
    updateFilters,
    clearFilters,
    setFilters,
  }
}