'use client'

import { useState, useCallback } from 'react'
import type { 
  Employee, 
  EmployeesResponse, 
  CreateEmployeeRequest,
  Attendance, 
  AttendanceResponse,
  CreateAttendanceRequest,
  LeaveRequest, 
  LeaveResponse,
  CreateLeaveRequest,
  PayrollRecord, 
  PayrollResponse,
  CreatePayrollRequest,
  PerformanceReview
} from '@/types/hr'

// Dashboard Hook
export function useHRDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/hr/dashboard')
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch dashboard data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, fetchDashboard }
}

// Employees Hook
export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEmployees = useCallback(async (params?: {
    page?: number
    limit?: number
    search?: string
    department?: string
    position?: string
    status?: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.append('page', params.page.toString())
      if (params?.limit) searchParams.append('limit', params.limit.toString())
      if (params?.search) searchParams.append('search', params.search)
      if (params?.department) searchParams.append('department', params.department)
      if (params?.position) searchParams.append('position', params.position)
      if (params?.status) searchParams.append('status', params.status)

      const response = await fetch(`/api/hr/employees?${searchParams}`)
      const result = await response.json()
      
      if (result.success) {
        const data: EmployeesResponse = result.data
        setEmployees(data.employees)
        setTotal(data.total)
      } else {
        setError(result.error || 'Failed to fetch employees')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  const createEmployee = useCallback(async (employeeData: CreateEmployeeRequest) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData)
      })
      const result = await response.json()
      
      if (result.success) {
        // Refresh the list
        fetchEmployees()
        return result.data
      } else {
        setError(result.error || 'Failed to create employee')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchEmployees])

  return { 
    employees, 
    total, 
    loading, 
    error, 
    fetchEmployees, 
    createEmployee 
  }
}

// Attendance Hook
export function useAttendance() {
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAttendance = useCallback(async (params?: {
    page?: number
    limit?: number
    employeeId?: string
    department?: string
    status?: string
    dateFrom?: string
    dateTo?: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.append('page', params.page.toString())
      if (params?.limit) searchParams.append('limit', params.limit.toString())
      if (params?.employeeId) searchParams.append('employeeId', params.employeeId)
      if (params?.department) searchParams.append('department', params.department)
      if (params?.status) searchParams.append('status', params.status)
      if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom)
      if (params?.dateTo) searchParams.append('dateTo', params.dateTo)

      const response = await fetch(`/api/hr/attendance?${searchParams}`)
      const result = await response.json()
      
      if (result.success) {
        const data: AttendanceResponse = result.data
        setAttendance(data.attendance)
        setTotal(data.total)
      } else {
        setError(result.error || 'Failed to fetch attendance')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  const createAttendance = useCallback(async (attendanceData: CreateAttendanceRequest) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendanceData)
      })
      const result = await response.json()
      
      if (result.success) {
        fetchAttendance()
        return result.data
      } else {
        setError(result.error || 'Failed to create attendance record')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchAttendance])

  return { 
    attendance, 
    total, 
    loading, 
    error, 
    fetchAttendance, 
    createAttendance 
  }
}

// Leave Hook
export function useLeave() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaveRequests = useCallback(async (params?: {
    page?: number
    limit?: number
    employeeId?: string
    department?: string
    status?: string
    type?: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.append('page', params.page.toString())
      if (params?.limit) searchParams.append('limit', params.limit.toString())
      if (params?.employeeId) searchParams.append('employeeId', params.employeeId)
      if (params?.department) searchParams.append('department', params.department)
      if (params?.status) searchParams.append('status', params.status)
      if (params?.type) searchParams.append('type', params.type)

      const response = await fetch(`/api/hr/leave?${searchParams}`)
      const result = await response.json()
      
      if (result.success) {
        const data: LeaveResponse = result.data
        setLeaveRequests(data.leaves)
        setTotal(data.total)
      } else {
        setError(result.error || 'Failed to fetch leave requests')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  const createLeaveRequest = useCallback(async (leaveData: CreateLeaveRequest) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/hr/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveData)
      })
      const result = await response.json()
      
      if (result.success) {
        fetchLeaveRequests()
        return result.data
      } else {
        setError(result.error || 'Failed to create leave request')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchLeaveRequests])

  return { 
    leaveRequests, 
    total, 
    loading, 
    error, 
    fetchLeaveRequests, 
    createLeaveRequest 
  }
}

// Payroll Hook
export function usePayroll() {
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPayrollRecords = useCallback(async (params?: {
    page?: number
    limit?: number
    employeeId?: string
    department?: string
    status?: string
    payPeriod?: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.append('page', params.page.toString())
      if (params?.limit) searchParams.append('limit', params.limit.toString())
      if (params?.employeeId) searchParams.append('employeeId', params.employeeId)
      if (params?.department) searchParams.append('department', params.department)
      if (params?.status) searchParams.append('status', params.status)
      if (params?.payPeriod) searchParams.append('payPeriod', params.payPeriod)

      const response = await fetch(`/api/hr/payroll?${searchParams}`)
      const result = await response.json()
      
      if (result.success) {
        const data: PayrollResponse = result.data
        setPayrollRecords(data.payrolls)
        setTotal(data.total)
      } else {
        setError(result.error || 'Failed to fetch payroll records')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  const createPayrollRecord = useCallback(async (payrollData: CreatePayrollRequest) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/hr/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payrollData)
      })
      const result = await response.json()
      
      if (result.success) {
        fetchPayrollRecords()
        return result.data
      } else {
        setError(result.error || 'Failed to create payroll record')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchPayrollRecords])

  return { 
    payrollRecords, 
    total, 
    loading, 
    error, 
    fetchPayrollRecords, 
    createPayrollRecord 
  }
}

// Performance Hook
export function usePerformance() {
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPerformanceReviews = useCallback(async (params?: {
    page?: number
    limit?: number
    employeeId?: string
    reviewType?: string
    status?: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.append('page', params.page.toString())
      if (params?.limit) searchParams.append('limit', params.limit.toString())
      if (params?.employeeId) searchParams.append('employeeId', params.employeeId)
      if (params?.reviewType) searchParams.append('reviewType', params.reviewType)
      if (params?.status) searchParams.append('status', params.status)

      const response = await fetch(`/api/hr/performance?${searchParams}`)
      const result = await response.json()
      
      if (result.success) {
        const data = result.data
        setPerformanceReviews(data.reviews)
        setTotal(data.total)
      } else {
        setError(result.error || 'Failed to fetch performance reviews')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  const createPerformanceReview = useCallback(async (reviewData: any) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/hr/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
      })
      const result = await response.json()
      
      if (result.success) {
        fetchPerformanceReviews()
        return result.data
      } else {
        setError(result.error || 'Failed to create performance review')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchPerformanceReviews])

  return { 
    performanceReviews, 
    total, 
    loading, 
    error, 
    fetchPerformanceReviews, 
    createPerformanceReview 
  }
}