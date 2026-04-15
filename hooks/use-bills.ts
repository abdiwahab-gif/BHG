import { useState, useEffect } from 'react'
import { Bill, BillFilters, BillListResponse } from '@/types/finance'

export function useBills(initialFilters?: Partial<BillFilters>) {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  const [filters, setFilters] = useState<BillFilters>({
    page: 1,
    limit: 10,
    ...initialFilters
  })

  const fetchBills = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/finance/bills?${queryParams}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch bills')
      }
      
      const data: BillListResponse = await response.json()
      setBills(data.bills)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const recordPayment = async (billId: string, paymentData: {
    amount: number
    paymentMethod: string
    paymentDate: string
    reference?: string
    totalAmount: number
  }) => {
    try {
      const response = await fetch(`/api/finance/bills/${billId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...paymentData,
          billId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record payment')
      }

      const result = await response.json()
      
      // Refresh the bills list
      await fetchBills()
      
      return result
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to record payment')
    }
  }

  const createBill = async (billData: any) => {
    try {
      const response = await fetch('/api/finance/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(billData)
      })

      if (!response.ok) {
        throw new Error('Failed to create bill')
      }

      const result = await response.json()
      
      // Refresh the bills list
      await fetchBills()
      
      return result
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create bill')
    }
  }

  useEffect(() => {
    fetchBills()
  }, [filters])

  return {
    bills,
    loading,
    error,
    pagination,
    filters,
    setFilters,
    recordPayment,
    createBill,
    refetch: fetchBills
  }
}