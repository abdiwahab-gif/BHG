import { useState, useEffect } from 'react'
import type { 
  LibraryStats, 
  Book, 
  BookBorrow, 
  LibraryMember, 
  LibraryFine,
  BooksResponse,
  BorrowsResponse,
  MembersResponse,
  FinesResponse,
  BookFilters,
  BorrowFilters,
  LibraryFilters,
  CreateBookRequest,
  UpdateBookRequest,
  BorrowBookRequest,
  ReturnBookRequest,
  CreateMemberRequest,
  UpdateMemberRequest,
  CreateFineRequest,
  PayFineRequest
} from '@/types/library'

// Library dashboard hook
export function useLibraryDashboard() {
  const [data, setData] = useState<LibraryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/library/dashboard')
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch dashboard data')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  return {
    data,
    loading,
    error,
    refetch: fetchDashboard
  }
}

// Books hook
export function useBooks(filters: BookFilters = {}, page = 1, limit = 10) {
  const [data, setData] = useState<BooksResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBooks = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.category && { category: filters.category }),
        ...(filters.status && { status: filters.status }),
        ...(filters.availability && { availability: filters.availability })
      })
      
      const response = await fetch(`/api/library/books?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch books')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('Books fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const createBook = async (bookData: CreateBookRequest) => {
    try {
      const response = await fetch('/api/library/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData)
      })
      
      const result = await response.json()
      if (result.success) {
        await fetchBooks() // Refresh the list
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error('Create book error:', err)
      return { success: false, error: 'Network error occurred' }
    }
  }

  const updateBook = async (bookData: UpdateBookRequest) => {
    try {
      const response = await fetch('/api/library/books', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData)
      })
      
      const result = await response.json()
      if (result.success) {
        await fetchBooks() // Refresh the list
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error('Update book error:', err)
      return { success: false, error: 'Network error occurred' }
    }
  }

  const deleteBook = async (bookId: string) => {
    try {
      const response = await fetch(`/api/library/books?id=${bookId}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      if (result.success) {
        await fetchBooks() // Refresh the list
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error('Delete book error:', err)
      return { success: false, error: 'Network error occurred' }
    }
  }

  useEffect(() => {
    fetchBooks()
  }, [filters, page, limit])

  return {
    data,
    loading,
    error,
    refetch: fetchBooks,
    createBook,
    updateBook,
    deleteBook
  }
}

// Borrows hook
export function useBorrows(filters: BorrowFilters = {}, page = 1, limit = 10) {
  const [data, setData] = useState<BorrowsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBorrows = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.memberType && { borrowerType: filters.memberType }),
        ...(filters.overdue && { overdue: 'true' })
      })
      
      const response = await fetch(`/api/library/borrows?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch borrows')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('Borrows fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const borrowBook = async (borrowData: BorrowBookRequest) => {
    try {
      const response = await fetch('/api/library/borrows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(borrowData)
      })
      
      const result = await response.json()
      if (result.success) {
        await fetchBorrows() // Refresh the list
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error('Borrow book error:', err)
      return { success: false, error: 'Network error occurred' }
    }
  }

  const returnBook = async (returnData: ReturnBookRequest) => {
    try {
      const response = await fetch('/api/library/borrows', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnData)
      })
      
      const result = await response.json()
      if (result.success) {
        await fetchBorrows() // Refresh the list
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error('Return book error:', err)
      return { success: false, error: 'Network error occurred' }
    }
  }

  useEffect(() => {
    fetchBorrows()
  }, [filters, page, limit])

  return {
    data,
    loading,
    error,
    refetch: fetchBorrows,
    borrowBook,
    returnBook
  }
}

// Members hook
export function useMembers(filters: LibraryFilters = {}, page = 1, limit = 10) {
  const [data, setData] = useState<MembersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.memberType && { type: filters.memberType }),
        ...(filters.status && { status: filters.status })
      })
      
      const response = await fetch(`/api/library/members?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch members')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('Members fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const createMember = async (memberData: CreateMemberRequest) => {
    try {
      const response = await fetch('/api/library/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData)
      })
      
      const result = await response.json()
      if (result.success) {
        await fetchMembers() // Refresh the list
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error('Create member error:', err)
      return { success: false, error: 'Network error occurred' }
    }
  }

  const updateMember = async (memberData: UpdateMemberRequest) => {
    try {
      const response = await fetch('/api/library/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData)
      })
      
      const result = await response.json()
      if (result.success) {
        await fetchMembers() // Refresh the list
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error('Update member error:', err)
      return { success: false, error: 'Network error occurred' }
    }
  }

  const deleteMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/library/members?id=${memberId}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      if (result.success) {
        await fetchMembers() // Refresh the list
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error('Delete member error:', err)
      return { success: false, error: 'Network error occurred' }
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [filters, page, limit])

  return {
    data,
    loading,
    error,
    refetch: fetchMembers,
    createMember,
    updateMember,
    deleteMember
  }
}

// Fines hook
export function useFines(filters: LibraryFilters = {}, page = 1, limit = 10) {
  const [data, setData] = useState<FinesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFines = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.fineStatus && { fineType: filters.fineStatus })
      })
      
      const response = await fetch(`/api/library/fines?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch fines')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('Fines fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const createFine = async (fineData: CreateFineRequest) => {
    try {
      const response = await fetch('/api/library/fines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fineData)
      })
      
      const result = await response.json()
      if (result.success) {
        await fetchFines() // Refresh the list
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error('Create fine error:', err)
      return { success: false, error: 'Network error occurred' }
    }
  }

  const payFine = async (paymentData: PayFineRequest) => {
    try {
      const response = await fetch('/api/library/fines', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      })
      
      const result = await response.json()
      if (result.success) {
        await fetchFines() // Refresh the list
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error('Pay fine error:', err)
      return { success: false, error: 'Network error occurred' }
    }
  }

  const waiveFine = async (fineId: string, reason?: string) => {
    try {
      const response = await fetch(`/api/library/fines?id=${fineId}&waiveReason=${encodeURIComponent(reason || 'Waived by administrator')}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      if (result.success) {
        await fetchFines() // Refresh the list
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error('Waive fine error:', err)
      return { success: false, error: 'Network error occurred' }
    }
  }

  useEffect(() => {
    fetchFines()
  }, [filters, page, limit])

  return {
    data,
    loading,
    error,
    refetch: fetchFines,
    createFine,
    payFine,
    waiveFine
  }
}