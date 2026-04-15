import { useState, useEffect } from 'react'
import { StudentAccount, StudentAccountFilters, StudentAccountListResponse } from '@/types/finance'

export function useStudentAccounts(initialFilters?: Partial<StudentAccountFilters>) {
  const [accounts, setAccounts] = useState<StudentAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  const [filters, setFilters] = useState<StudentAccountFilters>({
    page: 1,
    limit: 10,
    ...initialFilters
  })

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/finance/student-accounts?${queryParams}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch student accounts')
      }
      
      const data: StudentAccountListResponse = await response.json()
      setAccounts(data.studentAccounts)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const recordPayment = async (accountId: string, paymentData: {
    amount: number
    paymentMethod: string
    paymentDate: string
    reference?: string
  }) => {
    try {
      const response = await fetch(`/api/finance/student-accounts/${accountId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      })

      if (!response.ok) {
        throw new Error('Failed to record payment')
      }

      const result = await response.json()
      
      // Refresh the accounts list
      await fetchAccounts()
      
      return result
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to record payment')
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [filters])

  return {
    accounts,
    loading,
    error,
    pagination,
    filters,
    setFilters,
    recordPayment,
    refetch: fetchAccounts
  }
}