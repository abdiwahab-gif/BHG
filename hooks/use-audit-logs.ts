import { useQuery } from "@tanstack/react-query"
import { getAuditHeaders } from "@/lib/client-audit"

export interface AuditLogFilters {
  userId?: string
  entityType?: string
  entityId?: string
  action?: string
  dateFrom?: Date
  dateTo?: Date
  page?: number
  limit?: number
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            params.append(key, value.toISOString())
          } else {
            params.append(key, value.toString())
          }
        }
      })

      const response = await fetch(`/api/audit-logs?${params}`, {
        headers: {
          ...getAuditHeaders(),
        },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch audit logs")
      }
      return response.json()
    },
  })
}

export function useEntityAuditLogs(entityType: string, entityId: string) {
  return useAuditLogs({
    entityType,
    entityId,
  })
}

export function useUserAuditLogs(userId: string) {
  return useAuditLogs({
    userId,
  })
}
