import { useState, useEffect, useCallback } from 'react'
import { Notice, NoticeFilters, NoticeResponse, NoticeStats } from '@/types/notice'

interface UseNoticesOptions {
  initialFilters?: NoticeFilters
  page?: number
  limit?: number
}

export function useNotices(options: UseNoticesOptions = {}) {
  const { initialFilters = {}, page = 1, limit = 10 } = options
  
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<NoticeFilters>(initialFilters)

  const fetchNotices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      })

      const response = await fetch(`/api/notice?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch notices')
      }

      const data: NoticeResponse = await response.json()
      setNotices(data.notices)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [filters, page, limit])

  const updateFilters = (newFilters: Partial<NoticeFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  useEffect(() => {
    fetchNotices()
  }, [filters, page, limit])

  useEffect(() => {
    if (typeof window === "undefined") return
    const handler = () => {
      fetchNotices()
    }
    window.addEventListener("notices:changed", handler)
    return () => window.removeEventListener("notices:changed", handler)
  }, [fetchNotices])

  return {
    notices,
    loading,
    error,
    total,
    filters,
    updateFilters,
    clearFilters,
    refetch: fetchNotices
  }
}

export function useNoticeStats() {
  const [stats, setStats] = useState<NoticeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/notice/stats')
      if (!response.ok) {
        throw new Error('Failed to fetch notice stats')
      }

      const data: NoticeStats = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const handler = () => {
      fetchStats()
    }
    window.addEventListener("notices:changed", handler)
    return () => window.removeEventListener("notices:changed", handler)
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}

export function useNotice(id: string) {
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotice = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/notice/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch notice')
      }

      const data: Notice = await response.json()
      setNotice(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const updateNotice = async (updates: Partial<Notice>) => {
    try {
      const response = await fetch(`/api/notice/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update notice')
      }

      const updatedNotice: Notice = await response.json()
      setNotice(updatedNotice)
      return updatedNotice
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update notice')
    }
  }

  const deleteNotice = async () => {
    try {
      const response = await fetch(`/api/notice/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete notice')
      }

      return true
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete notice')
    }
  }

  useEffect(() => {
    if (id) {
      fetchNotice()
    }
  }, [id])

  return {
    notice,
    loading,
    error,
    updateNotice,
    deleteNotice,
    refetch: fetchNotice
  }
}