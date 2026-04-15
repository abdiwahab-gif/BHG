import { useState, useEffect } from 'react'
import { FinancialDashboardStats } from '@/types/finance'

export function useFinanceDashboard() {
  const [stats, setStats] = useState<FinancialDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/finance/dashboard')
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats')
      }
      
      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  return {
    stats,
    loading,
    error,
    refetch: fetchDashboardStats
  }
}