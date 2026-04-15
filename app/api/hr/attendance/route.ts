import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import type { RowDataPacket } from 'mysql2/promise'
import type { Attendance, AttendanceResponse, CreateAttendanceRequest } from '@/types/hr'
import { dbQuery } from '@/lib/db'
import { ensureHRAllTables } from '@/app/api/hr/_db'

type DbDailyRow = RowDataPacket & {
  employeeId: string
  date: string
  clockIn: Date | string | null
  clockOut: Date | string | null
  location: string
  notes: string | null
  eventCount: number
  manualCount: number
  createdAt: Date | string
}

type CountRow = RowDataPacket & { total: number }

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

function toDateOnly(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toISOString().slice(0, 10)
}

function hoursBetween(a?: string, b?: string): number {
  if (!a || !b) return 0
  const da = new Date(a)
  const db = new Date(b)
  const ms = db.getTime() - da.getTime()
  if (!Number.isFinite(ms) || ms <= 0) return 0
  return ms / (1000 * 60 * 60)
}

function deriveStatus(clockInIso?: string): Attendance['status'] {
  if (!clockInIso) return 'absent'
  // Minimal rule: if clock-in is after 09:05 local time => late
  const d = new Date(clockInIso)
  if (Number.isNaN(d.getTime())) return 'present'
  const hh = d.getHours()
  const mm = d.getMinutes()
  return hh > 9 || (hh === 9 && mm > 5) ? 'late' : 'present'
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
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    const safePage = Number.isFinite(page) && page > 0 ? page : 1
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 10
    const offset = (safePage - 1) * safeLimit

    const where: string[] = []
    const params: any[] = []
    let joinEmployees = false

    if (employeeId) {
      where.push('e.employeeId = ?')
      params.push(employeeId)
    }
    if (dateFrom) {
      where.push('DATE(e.eventTime) >= ?')
      params.push(dateFrom)
    }
    if (dateTo) {
      where.push('DATE(e.eventTime) <= ?')
      params.push(dateTo)
    }
    if (department && department !== 'all') {
      joinEmployees = true
      where.push('LOWER(COALESCE(emp.department,\'\')) = LOWER(?)')
      params.push(department)
    }

    const joinSql = joinEmployees ? 'LEFT JOIN hr_employees emp ON emp.employeeId = e.employeeId' : ''
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const countRows = await dbQuery<CountRow>(
      `SELECT COUNT(*) as total FROM (
         SELECT e.employeeId, DATE(e.eventTime) as d
         FROM hr_attendance_events e
         ${joinSql}
         ${whereSql}
         GROUP BY e.employeeId, DATE(e.eventTime)
       ) t`,
      params,
    )
    const total = Number(countRows?.[0]?.total ?? 0)
    const totalPages = Math.ceil(total / safeLimit)

    const rows = await dbQuery<DbDailyRow>(
      `SELECT
         e.employeeId as employeeId,
         DATE(e.eventTime) as date,
         MIN(e.eventTime) as clockIn,
         MAX(e.eventTime) as clockOut,
         MAX(e.location) as location,
         MAX(e.notes) as notes,
         COUNT(*) as eventCount,
         SUM(CASE WHEN e.source = 'manual' THEN 1 ELSE 0 END) as manualCount,
         MIN(e.createdAt) as createdAt
       FROM hr_attendance_events e
       ${joinSql}
       ${whereSql}
       GROUP BY e.employeeId, DATE(e.eventTime)
       ORDER BY date DESC, clockIn DESC
       LIMIT ${safeLimit} OFFSET ${offset}`,
      params,
    )

    const mapped: Attendance[] = (rows || []).map((r) => {
      const date = toDateOnly(String(r.date))
      const clockIn = toIso(r.clockIn)
      const clockOut = toIso(r.clockOut)
      const rawHours = hoursBetween(clockIn, clockOut)
      const hoursWorked = rawHours > 1 ? rawHours - 1 : rawHours
      const overtimeHours = Math.max(0, hoursWorked - 8)
      const derived = deriveStatus(clockIn)

      return {
        id: `${r.employeeId}-${date}`,
        employeeId: r.employeeId,
        date,
        clockIn,
        clockOut,
        breakStart: undefined,
        breakEnd: undefined,
        hoursWorked,
        overtimeHours,
        status: derived,
        location: r.location || 'Office',
        notes: r.notes || undefined,
        approvedBy: undefined,
        isManualEntry: Number(r.manualCount || 0) === Number(r.eventCount || 0),
        createdAt: toIso(r.createdAt) || new Date().toISOString(),
      }
    })

    const filteredByStatus = status && status !== 'all'
      ? mapped.filter((m) => m.status === status)
      : mapped

    const response: AttendanceResponse = {
      attendance: filteredByStatus,
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
    console.error('Error fetching attendance:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch attendance' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureHRAllTables()
    const attendanceData: CreateAttendanceRequest = await request.json()
    
    if (!attendanceData.employeeId || !attendanceData.date || !attendanceData.clockIn) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Employee ID, date, and clock in time are required' 
        },
        { status: 400 }
      )
    }

    const employeeId = String(attendanceData.employeeId || '').trim()
    const date = String(attendanceData.date || '').slice(0, 10)
    const location = String(attendanceData.location || 'Office').trim() || 'Office'
    const notes = attendanceData.notes ? String(attendanceData.notes) : null

    const clockInTime = new Date(attendanceData.clockIn)
    if (Number.isNaN(clockInTime.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid clock in time' },
        { status: 400 },
      )
    }

    const eventInId = crypto.randomUUID()
    await dbQuery(
      `INSERT INTO hr_attendance_events (
         id, employeeId, eventTime, eventType, location, notes, source, deviceId
       ) VALUES (?, ?, ?, ?, ?, ?, 'manual', NULL)`,
      [eventInId, employeeId, clockInTime, 'clock_in', location, notes],
    )

    if (attendanceData.clockOut) {
      const clockOutTime = new Date(attendanceData.clockOut)
      if (!Number.isNaN(clockOutTime.getTime())) {
        const eventOutId = crypto.randomUUID()
        await dbQuery(
          `INSERT INTO hr_attendance_events (
             id, employeeId, eventTime, eventType, location, notes, source, deviceId
           ) VALUES (?, ?, ?, ?, ?, ?, 'manual', NULL)`,
          [eventOutId, employeeId, clockOutTime, 'clock_out', location, notes],
        )
      }
    }

    const clockInIso = clockInTime.toISOString()
    const clockOutIso = attendanceData.clockOut ? toIso(attendanceData.clockOut) : undefined
    const rawHours = hoursBetween(clockInIso, clockOutIso)
    const hoursWorked = rawHours > 1 ? rawHours - 1 : rawHours
    const overtimeHours = Math.max(0, hoursWorked - 8)

    const newAttendance: Attendance = {
      id: `${employeeId}-${date}`,
      employeeId,
      date,
      clockIn: clockInIso,
      clockOut: clockOutIso,
      hoursWorked,
      overtimeHours,
      status: deriveStatus(clockInIso),
      location,
      notes: attendanceData.notes,
      isManualEntry: true,
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: newAttendance,
      message: 'Attendance record created successfully'
    })
  } catch (error) {
    console.error('Error creating attendance:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create attendance record' 
      },
      { status: 500 }
    )
  }
}