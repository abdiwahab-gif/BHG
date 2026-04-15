import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import type { RowDataPacket } from 'mysql2/promise'
import type { EmployeesResponse } from '@/types/hr'
import { dbQuery } from '@/lib/db'
import { ensureHRAllTables } from '@/app/api/hr/_db'

type DbEmployeeRow = RowDataPacket & {
  id: string
  sequence: number
  employeeId: string | null
  biometricUserId: string | null
  firstName: string
  lastName: string
  email: string
  phone: string | null
  department: string | null
  position: string | null
  employeeType: string
  employmentStatus: string
  hireDate: Date | string | null
  salary: string | number
  salaryType: string
  currency: string
  payGrade: string | null
  workLocation: string | null
  timezone: string
  dateOfBirth: Date | string | null
  gender: string
  maritalStatus: string
  nationality: string | null
  addressJson: any
  emergencyContactJson: any
  workScheduleJson: any
  benefitsJson: any
  skillsJson: any
  educationJson: any
  certificationsJson: any
  languagesJson: any
  createdBy: string
  isActive: number
  createdAt: Date | string
  updatedAt: Date | string
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

function employeeCodeFromSequence(sequence: number): string {
  const n = Number(sequence)
  if (!Number.isFinite(n) || n <= 0) return 'EMP-0000'
  return `EMP-${String(n).padStart(4, '0')}`
}

function mapEmployeeRow(row: DbEmployeeRow): any {
  const employeeId = row.employeeId || employeeCodeFromSequence(row.sequence)
  const address = parseJson(row.addressJson, {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  })
  const emergencyContact = parseJson(row.emergencyContactJson, {
    name: '',
    relationship: '',
    phone: '',
    email: '',
  })
  const workSchedule = parseJson(row.workScheduleJson, {
    type: 'standard',
    hoursPerWeek: 40,
    workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 60,
  })

  return {
    id: row.id,
    employeeId,
    biometricUserId: row.biometricUserId || '',
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
    email: row.email,
    phone: row.phone || '',
    personalEmail: '',
    dateOfBirth: toDateOnly(row.dateOfBirth),
    gender: (row.gender || 'other') as any,
    maritalStatus: (row.maritalStatus || 'single') as any,
    nationality: row.nationality || '',
    address,
    emergencyContact,

    position: row.position || '',
    department: row.department || '',
    division: '',
    managerId: '',
    manager: '',
    employeeType: (row.employeeType || 'full-time') as any,
    employmentStatus: (row.employmentStatus || 'active') as any,
    hireDate: toDateOnly(row.hireDate),
    terminationDate: '',
    probationEndDate: '',

    salary: Number(row.salary || 0),
    salaryType: (row.salaryType || 'monthly') as any,
    currency: row.currency || 'USD',
    payGrade: row.payGrade || '',
    benefits: parseJson(row.benefitsJson, [] as string[]),

    workLocation: row.workLocation || '',
    workSchedule,
    timezone: row.timezone || 'UTC',

    taxId: '',
    socialSecurityNumber: '',
    passportNumber: '',
    visaStatus: '',
    workPermitExpiry: '',

    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    createdBy: row.createdBy || 'system',
    isActive: Boolean(row.isActive),
    profilePicture: '',

    skills: parseJson(row.skillsJson, []),
    education: parseJson(row.educationJson, []),
    certifications: parseJson(row.certificationsJson, []),
    languages: parseJson(row.languagesJson, []),
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureHRAllTables()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const department = searchParams.get('department') || ''
    const position = searchParams.get('position') || ''
    const employmentStatus = searchParams.get('status') || searchParams.get('employmentStatus') || ''
    const employeeType = searchParams.get('employeeType') || ''

    const safePage = Number.isFinite(page) && page > 0 ? page : 1
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 10
    const offset = (safePage - 1) * safeLimit

    const where: string[] = []
    const params: any[] = []

    if (search) {
      where.push(
        "(LOWER(firstName) LIKE ? OR LOWER(lastName) LIKE ? OR LOWER(email) LIKE ? OR LOWER(COALESCE(employeeId,'')) LIKE ? OR LOWER(COALESCE(position,'')) LIKE ?)"
      )
      const q = `%${search.toLowerCase()}%`
      params.push(q, q, q, q, q)
    }
    if (department && department !== 'all') {
      where.push('LOWER(COALESCE(department,\'\')) = LOWER(?)')
      params.push(department)
    }
    if (position && position !== 'all') {
      where.push('LOWER(COALESCE(position,\'\')) = LOWER(?)')
      params.push(position)
    }
    if (employmentStatus && employmentStatus !== 'all') {
      where.push('LOWER(employmentStatus) = LOWER(?)')
      params.push(employmentStatus)
    }
    if (employeeType && employeeType !== 'all') {
      where.push('LOWER(employeeType) = LOWER(?)')
      params.push(employeeType)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const countRows = await dbQuery<CountRow>(
      `SELECT COUNT(*) as total FROM hr_employees ${whereSql}`,
      params,
    )
    const total = Number(countRows?.[0]?.total ?? 0)
    const totalPages = Math.ceil(total / safeLimit)

    const rows = await dbQuery<DbEmployeeRow>(
      `SELECT
         id, sequence, employeeId, biometricUserId,
         firstName, lastName, email, phone,
         department, position, employeeType, employmentStatus, hireDate,
         salary, salaryType, currency, payGrade,
         workLocation, timezone,
         dateOfBirth, gender, maritalStatus, nationality,
         addressJson, emergencyContactJson, workScheduleJson,
         benefitsJson, skillsJson, educationJson, certificationsJson, languagesJson,
         createdBy, isActive, createdAt, updatedAt
       FROM hr_employees
       ${whereSql}
       ORDER BY createdAt DESC
       LIMIT ${safeLimit} OFFSET ${offset}`,
      params,
    )

    const employees = (rows || []).map(mapEmployeeRow)

    const response: EmployeesResponse = {
      employees: employees as any,
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
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch employees' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureHRAllTables()
    const employeeData: any = await request.json()
    
    // Validate required fields
    if (!employeeData.firstName || !employeeData.lastName || !employeeData.email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'First name, last name, and email are required' 
        },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existing = await dbQuery<RowDataPacket & { id: string }>(
      'SELECT id FROM hr_employees WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [String(employeeData.email || '').trim()],
    )
    if (Array.isArray(existing) && existing.length) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Employee with this email already exists' 
        },
        { status: 409 }
      )
    }

    // Create new employee
    const id = crypto.randomUUID()

    const firstName = String(employeeData.firstName || '').trim()
    const lastName = String(employeeData.lastName || '').trim()
    const email = String(employeeData.email || '').trim()

    const biometricUserId = employeeData.biometricUserId
      ? String(employeeData.biometricUserId).trim()
      : null

    const phone = employeeData.phone ? String(employeeData.phone).trim() : null
    const department = employeeData.department ? String(employeeData.department).trim() : null
    const position = employeeData.position ? String(employeeData.position).trim() : null
    const employeeType = String(employeeData.employeeType || 'full-time').trim() || 'full-time'
    const employmentStatus = String(employeeData.employmentStatus || 'active').trim() || 'active'
    const hireDate = employeeData.hireDate ? String(employeeData.hireDate).slice(0, 10) : null

    const salary = Number(employeeData.salary || 0)
    const salaryType = String(employeeData.salaryType || 'monthly').trim() || 'monthly'
    const currency = String(employeeData.currency || 'USD').trim() || 'USD'
    const payGrade = employeeData.payGrade ? String(employeeData.payGrade).trim() : null

    const workLocation = employeeData.workLocation ? String(employeeData.workLocation).trim() : null
    const timezone = String(employeeData.timezone || 'UTC').trim() || 'UTC'

    const dateOfBirth = employeeData.dateOfBirth ? String(employeeData.dateOfBirth).slice(0, 10) : null
    const gender = String(employeeData.gender || 'other').trim() || 'other'
    const maritalStatus = String(employeeData.maritalStatus || 'single').trim() || 'single'
    const nationality = employeeData.nationality ? String(employeeData.nationality).trim() : null

    const addressJson = employeeData.address ? JSON.stringify(employeeData.address) : null
    const emergencyContactJson = employeeData.emergencyContact ? JSON.stringify(employeeData.emergencyContact) : null
    const workScheduleJson = employeeData.workSchedule ? JSON.stringify(employeeData.workSchedule) : null

    const benefitsJson = employeeData.benefits ? JSON.stringify(employeeData.benefits) : null
    const skillsJson = employeeData.skills ? JSON.stringify(employeeData.skills) : null
    const educationJson = employeeData.education ? JSON.stringify(employeeData.education) : null
    const certificationsJson = employeeData.certifications ? JSON.stringify(employeeData.certifications) : null
    const languagesJson = employeeData.languages ? JSON.stringify(employeeData.languages) : null

    await dbQuery(
      `INSERT INTO hr_employees (
         id, employeeId, biometricUserId,
         firstName, lastName, email, phone,
         department, position, employeeType, employmentStatus, hireDate,
         salary, salaryType, currency, payGrade,
         workLocation, timezone,
         dateOfBirth, gender, maritalStatus, nationality,
         addressJson, emergencyContactJson, workScheduleJson,
         benefitsJson, skillsJson, educationJson, certificationsJson, languagesJson,
         createdBy, isActive
       ) VALUES (
         ?, NULL, ?,
         ?, ?, ?, ?,
         ?, ?, ?, ?, ?,
         ?, ?, ?, ?,
         ?, ?,
         ?, ?, ?, ?,
         ?, ?, ?,
         ?, ?, ?, ?, ?,
         ?, TRUE
       )`,
      [
        id,
        biometricUserId,
        firstName,
        lastName,
        email,
        phone,
        department,
        position,
        employeeType,
        employmentStatus,
        hireDate,
        salary,
        salaryType,
        currency,
        payGrade,
        workLocation,
        timezone,
        dateOfBirth,
        gender,
        maritalStatus,
        nationality,
        addressJson,
        emergencyContactJson,
        workScheduleJson,
        benefitsJson,
        skillsJson,
        educationJson,
        certificationsJson,
        languagesJson,
        String(employeeData.createdBy || 'system'),
      ],
    )

    const seqRows = await dbQuery<RowDataPacket & { sequence: number }>(
      'SELECT sequence, employeeId FROM hr_employees WHERE id = ? LIMIT 1',
      [id],
    )
    const sequence = Number(seqRows?.[0]?.sequence ?? 0)
    const code = seqRows?.[0]?.employeeId ? String(seqRows?.[0]?.employeeId) : employeeCodeFromSequence(sequence)
    await dbQuery('UPDATE hr_employees SET employeeId = ? WHERE id = ? AND (employeeId IS NULL OR employeeId = \'\')', [code, id])

    const createdRows = await dbQuery<DbEmployeeRow>(
      `SELECT
         id, sequence, employeeId, biometricUserId,
         firstName, lastName, email, phone,
         department, position, employeeType, employmentStatus, hireDate,
         salary, salaryType, currency, payGrade,
         workLocation, timezone,
         dateOfBirth, gender, maritalStatus, nationality,
         addressJson, emergencyContactJson, workScheduleJson,
         benefitsJson, skillsJson, educationJson, certificationsJson, languagesJson,
         createdBy, isActive, createdAt, updatedAt
       FROM hr_employees WHERE id = ? LIMIT 1`,
      [id],
    )
    const newEmployee = createdRows?.[0] ? mapEmployeeRow(createdRows[0]) : null

    return NextResponse.json({
      success: true,
      data: newEmployee,
      message: 'Employee created successfully'
    })
  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create employee' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureHRAllTables()
    const employeeData: any = await request.json()
    
    if (!employeeData.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Employee ID is required' 
        },
        { status: 400 }
      )
    }

    const existing = await dbQuery<RowDataPacket & { id: string }>(
      'SELECT id FROM hr_employees WHERE id = ? LIMIT 1',
      [String(employeeData.id)],
    )
    if (!Array.isArray(existing) || existing.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Employee not found' 
        },
        { status: 404 }
      )
    }

    const fields: string[] = []
    const params: any[] = []

    const set = (sql: string, value: any) => {
      fields.push(sql)
      params.push(value)
    }

    if (employeeData.firstName !== undefined) set('firstName = ?', String(employeeData.firstName).trim())
    if (employeeData.lastName !== undefined) set('lastName = ?', String(employeeData.lastName).trim())
    if (employeeData.email !== undefined) set('email = ?', String(employeeData.email).trim())
    if (employeeData.phone !== undefined) set('phone = ?', employeeData.phone ? String(employeeData.phone).trim() : null)
    if (employeeData.department !== undefined) set('department = ?', employeeData.department ? String(employeeData.department).trim() : null)
    if (employeeData.position !== undefined) set('position = ?', employeeData.position ? String(employeeData.position).trim() : null)
    if (employeeData.employeeType !== undefined) set('employeeType = ?', String(employeeData.employeeType).trim())
    if (employeeData.employmentStatus !== undefined) set('employmentStatus = ?', String(employeeData.employmentStatus).trim())
    if (employeeData.hireDate !== undefined) set('hireDate = ?', employeeData.hireDate ? String(employeeData.hireDate).slice(0, 10) : null)

    if (employeeData.salary !== undefined) set('salary = ?', Number(employeeData.salary || 0))
    if (employeeData.salaryType !== undefined) set('salaryType = ?', String(employeeData.salaryType).trim())
    if (employeeData.currency !== undefined) set('currency = ?', String(employeeData.currency).trim())
    if (employeeData.payGrade !== undefined) set('payGrade = ?', employeeData.payGrade ? String(employeeData.payGrade).trim() : null)

    if (employeeData.workLocation !== undefined) set('workLocation = ?', employeeData.workLocation ? String(employeeData.workLocation).trim() : null)
    if (employeeData.timezone !== undefined) set('timezone = ?', String(employeeData.timezone).trim())

    if (employeeData.dateOfBirth !== undefined) set('dateOfBirth = ?', employeeData.dateOfBirth ? String(employeeData.dateOfBirth).slice(0, 10) : null)
    if (employeeData.gender !== undefined) set('gender = ?', String(employeeData.gender).trim())
    if (employeeData.maritalStatus !== undefined) set('maritalStatus = ?', String(employeeData.maritalStatus).trim())
    if (employeeData.nationality !== undefined) set('nationality = ?', employeeData.nationality ? String(employeeData.nationality).trim() : null)

    if (employeeData.address !== undefined) set('addressJson = ?', employeeData.address ? JSON.stringify(employeeData.address) : null)
    if (employeeData.emergencyContact !== undefined) set('emergencyContactJson = ?', employeeData.emergencyContact ? JSON.stringify(employeeData.emergencyContact) : null)
    if (employeeData.workSchedule !== undefined) set('workScheduleJson = ?', employeeData.workSchedule ? JSON.stringify(employeeData.workSchedule) : null)

    if (employeeData.benefits !== undefined) set('benefitsJson = ?', employeeData.benefits ? JSON.stringify(employeeData.benefits) : null)
    if (employeeData.skills !== undefined) set('skillsJson = ?', employeeData.skills ? JSON.stringify(employeeData.skills) : null)
    if (employeeData.education !== undefined) set('educationJson = ?', employeeData.education ? JSON.stringify(employeeData.education) : null)
    if (employeeData.certifications !== undefined) set('certificationsJson = ?', employeeData.certifications ? JSON.stringify(employeeData.certifications) : null)
    if (employeeData.languages !== undefined) set('languagesJson = ?', employeeData.languages ? JSON.stringify(employeeData.languages) : null)

    if (employeeData.biometricUserId !== undefined) {
      const v = employeeData.biometricUserId ? String(employeeData.biometricUserId).trim() : null
      set('biometricUserId = ?', v)
    }

    if (fields.length) {
      await dbQuery(
        `UPDATE hr_employees SET ${fields.join(', ')} WHERE id = ?`,
        [...params, String(employeeData.id)],
      )
    }

    const updatedRows = await dbQuery<DbEmployeeRow>(
      `SELECT
         id, sequence, employeeId, biometricUserId,
         firstName, lastName, email, phone,
         department, position, employeeType, employmentStatus, hireDate,
         salary, salaryType, currency, payGrade,
         workLocation, timezone,
         dateOfBirth, gender, maritalStatus, nationality,
         addressJson, emergencyContactJson, workScheduleJson,
         benefitsJson, skillsJson, educationJson, certificationsJson, languagesJson,
         createdBy, isActive, createdAt, updatedAt
       FROM hr_employees WHERE id = ? LIMIT 1`,
      [String(employeeData.id)],
    )
    const updatedEmployee = updatedRows?.[0] ? mapEmployeeRow(updatedRows[0]) : null

    return NextResponse.json({
      success: true,
      data: updatedEmployee,
      message: 'Employee updated successfully'
    })
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update employee' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureHRAllTables()
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('id')
    
    if (!employeeId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Employee ID is required' 
        },
        { status: 400 }
      )
    }

    const existing = await dbQuery<RowDataPacket & { id: string }>(
      'SELECT id FROM hr_employees WHERE id = ? LIMIT 1',
      [String(employeeId)],
    )
    if (!Array.isArray(existing) || existing.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Employee not found' 
        },
        { status: 404 }
      )
    }

    await dbQuery(
      "UPDATE hr_employees SET employmentStatus = 'terminated', isActive = FALSE WHERE id = ?",
      [String(employeeId)],
    )

    return NextResponse.json({
      success: true,
      message: 'Employee terminated successfully'
    })
  } catch (error) {
    console.error('Error terminating employee:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to terminate employee' 
      },
      { status: 500 }
    )
  }
}