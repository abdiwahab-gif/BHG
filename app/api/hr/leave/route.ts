import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import type { RowDataPacket } from 'mysql2/promise'
import type { LeaveResponse, CreateLeaveRequest, LeaveRequest } from '@/types/hr'
import { dbQuery } from '@/lib/db'
import { ensureHRAllTables } from '@/app/api/hr/_db'

type DbLeaveRow = RowDataPacket & {
  id: string
  employeeId: string
  leaveTypeId: string
  startDate: Date | string
  endDate: Date | string
  totalDays: number
  reason: string
  status: string
  appliedDate: Date | string
  reviewedDate: Date | string | null
  reviewedBy: string | null
  reviewerComments: string | null
  documentsJson: any
  isEmergency: number

  lt_id: string
  lt_name: string
  lt_description: string | null
  lt_maxDaysPerYear: number
  lt_carryForward: number
  lt_maxCarryForwardDays: number
  lt_requiresApproval: number
  lt_approverLevels: number
  lt_isPaid: number
  lt_minimumNotice: number
  lt_isActive: number
  lt_color: string
}

type CountRow = RowDataPacket & { total: number }

function toIso(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString()
  if (value instanceof Date) return value.toISOString()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

function toDateOnly(value: Date | string | null | undefined): string {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10)
}

function parseJson<T>(value: any, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'object') return value as T
  if (typeof value === 'string') {
    const s = value.trim()
    if (!s) return fallback
    try {
      return JSON.parse(s) as T
    } catch {
      return fallback
    }
  }
  return fallback
}

function mapLeaveRow(row: DbLeaveRow): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employeeId,
    leaveType: {
      id: row.lt_id,
      name: row.lt_name,
      description: row.lt_description || '',
      maxDaysPerYear: Number(row.lt_maxDaysPerYear || 0),
      carryForward: Boolean(row.lt_carryForward),
      maxCarryForwardDays: Number(row.lt_maxCarryForwardDays || 0),
      requiresApproval: Boolean(row.lt_requiresApproval),
      approverLevels: Number(row.lt_approverLevels || 0),
      isPaid: Boolean(row.lt_isPaid),
      minimumNotice: Number(row.lt_minimumNotice || 0),
      isActive: Boolean(row.lt_isActive),
      color: row.lt_color || '#64748b',
    },
    startDate: toDateOnly(row.startDate),
    endDate: toDateOnly(row.endDate),
    totalDays: Number(row.totalDays || 0),
    reason: row.reason || '',
    status: (row.status || 'pending') as any,
    appliedDate: toIso(row.appliedDate),
    reviewedDate: row.reviewedDate ? toIso(row.reviewedDate) : undefined,
    reviewedBy: row.reviewedBy || undefined,
    reviewerComments: row.reviewerComments || undefined,
    documents: parseJson(row.documentsJson, undefined as any),
    isEmergency: Boolean(row.isEmergency),
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureHRAllTables()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const employeeId = searchParams.get('employeeId') || ''
    const department = searchParams.get('department') || ''
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''

    const safePage = Number.isFinite(page) && page > 0 ? page : 1
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 10
    const offset = (safePage - 1) * safeLimit

    const where: string[] = []
    const params: any[] = []
    let joinEmployees = false

    if (employeeId) {
      where.push('lr.employeeId = ?')
      params.push(employeeId)
    }
    if (status && status !== 'all') {
      where.push('LOWER(lr.status) = LOWER(?)')
      params.push(status)
    }
    if (type && type !== 'all') {
      where.push('LOWER(lt.name) = LOWER(?)')
      params.push(type)
    }
    if (department && department !== 'all') {
      joinEmployees = true
      where.push('LOWER(COALESCE(e.department,\'\')) = LOWER(?)')
      params.push(department)
    }

    const joinSql = joinEmployees ? 'LEFT JOIN hr_employees e ON e.employeeId = lr.employeeId' : ''
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const countRows = await dbQuery<CountRow>(
      `SELECT COUNT(*) as total
       FROM hr_leave_requests lr
       JOIN hr_leave_types lt ON lt.id = lr.leaveTypeId
       ${joinSql}
       ${whereSql}`,
      params,
    )
    const total = Number(countRows?.[0]?.total ?? 0)
    const totalPages = Math.ceil(total / safeLimit)

    const rows = await dbQuery<DbLeaveRow>(
      `SELECT
         lr.id,
         lr.employeeId,
         lr.leaveTypeId,
         lr.startDate,
         lr.endDate,
         lr.totalDays,
         lr.reason,
         lr.status,
         lr.appliedDate,
         lr.reviewedDate,
         lr.reviewedBy,
         lr.reviewerComments,
         lr.documentsJson,
         lr.isEmergency,

         lt.id as lt_id,
         lt.name as lt_name,
         lt.description as lt_description,
         lt.maxDaysPerYear as lt_maxDaysPerYear,
         lt.carryForward as lt_carryForward,
         lt.maxCarryForwardDays as lt_maxCarryForwardDays,
         lt.requiresApproval as lt_requiresApproval,
         lt.approverLevels as lt_approverLevels,
         lt.isPaid as lt_isPaid,
         lt.minimumNotice as lt_minimumNotice,
         lt.isActive as lt_isActive,
         lt.color as lt_color
       FROM hr_leave_requests lr
       JOIN hr_leave_types lt ON lt.id = lr.leaveTypeId
       ${joinSql}
       ${whereSql}
       ORDER BY lr.appliedDate DESC
       LIMIT ${safeLimit} OFFSET ${offset}`,
      params,
    )

    const leaves = (rows || []).map(mapLeaveRow)

    const response: LeaveResponse = {
      leaves,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages
    }

    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('Error fetching leave requests:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch leave requests' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureHRAllTables()
    const leaveData: CreateLeaveRequest = await request.json()
    
    if (!leaveData.employeeId || !leaveData.leaveTypeId || !leaveData.startDate || !leaveData.endDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Employee ID, leave type ID, start date, and end date are required' 
        },
        { status: 400 }
      )
    }

    const typeRows = await dbQuery<RowDataPacket & {
      id: string
      name: string
      description: string | null
      maxDaysPerYear: number
      carryForward: number
      maxCarryForwardDays: number
      requiresApproval: number
      approverLevels: number
      isPaid: number
      minimumNotice: number
      isActive: number
      color: string
    }>(
      'SELECT * FROM hr_leave_types WHERE id = ? LIMIT 1',
      [leaveData.leaveTypeId],
    )

    const leaveType = Array.isArray(typeRows) && typeRows.length ? typeRows[0] : null
    if (!leaveType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid leave type ID' 
        },
        { status: 400 }
      )
    }

    // Calculate total days
    const startDate = new Date(leaveData.startDate)
    const endDate = new Date(leaveData.endDate)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid start or end date',
        },
        { status: 400 },
      )
    }
    if (endDate.getTime() < startDate.getTime()) {
      return NextResponse.json(
        {
          success: false,
          error: 'End date must be on or after start date',
        },
        { status: 400 },
      )
    }

    const timeDiff = endDate.getTime() - startDate.getTime()
    const totalDays = Math.floor(timeDiff / (1000 * 3600 * 24)) + 1

    const id = crypto.randomUUID()
    const documentsJson = leaveData.documents ? JSON.stringify(leaveData.documents) : null
    const now = new Date()

    await dbQuery(
      `INSERT INTO hr_leave_requests (
         id, employeeId, leaveTypeId,
         startDate, endDate, totalDays,
         reason, status, appliedDate,
         documentsJson, isEmergency
       ) VALUES (
         ?, ?, ?,
         ?, ?, ?,
         ?, 'pending', ?,
         ?, ?
       )`,
      [
        id,
        leaveData.employeeId,
        leaveData.leaveTypeId,
        String(leaveData.startDate).slice(0, 10),
        String(leaveData.endDate).slice(0, 10),
        totalDays,
        leaveData.reason || '',
        now,
        documentsJson,
        leaveData.isEmergency ? 1 : 0,
      ],
    )

    const created = await dbQuery<DbLeaveRow>(
      `SELECT
         lr.id,
         lr.employeeId,
         lr.leaveTypeId,
         lr.startDate,
         lr.endDate,
         lr.totalDays,
         lr.reason,
         lr.status,
         lr.appliedDate,
         lr.reviewedDate,
         lr.reviewedBy,
         lr.reviewerComments,
         lr.documentsJson,
         lr.isEmergency,
         lt.id as lt_id,
         lt.name as lt_name,
         lt.description as lt_description,
         lt.maxDaysPerYear as lt_maxDaysPerYear,
         lt.carryForward as lt_carryForward,
         lt.maxCarryForwardDays as lt_maxCarryForwardDays,
         lt.requiresApproval as lt_requiresApproval,
         lt.approverLevels as lt_approverLevels,
         lt.isPaid as lt_isPaid,
         lt.minimumNotice as lt_minimumNotice,
         lt.isActive as lt_isActive,
         lt.color as lt_color
       FROM hr_leave_requests lr
       JOIN hr_leave_types lt ON lt.id = lr.leaveTypeId
       WHERE lr.id = ?
       LIMIT 1`,
      [id],
    )

    const newLeaveRequest = created?.[0] ? mapLeaveRow(created[0]) : null

    return NextResponse.json({
      success: true,
      data: newLeaveRequest,
      message: 'Leave request submitted successfully'
    })
  } catch (error) {
    console.error('Error creating leave request:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create leave request' 
      },
      { status: 500 }
    )
  }
}