import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { type RowDataPacket } from 'mysql2/promise'
import { dbQuery } from '@/lib/db'
import { validatePasswordPolicy } from '@/lib/password-policy'
import { requireRole } from '@/lib/server-auth'

interface DbUser extends RowDataPacket {
  id: string
  email: string
  password: string
  name: string
  role: string
  isActive: boolean
}

// Validation functions
function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' }
  }

  const trimmedEmail = email.trim()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' }
  }

  if (trimmedEmail.length > 255) {
    return { valid: false, error: 'Email is too long (max 255 characters)' }
  }

  return { valid: true }
}

function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' }
  }

  const trimmedName = name.trim()

  if (trimmedName.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' }
  }

  if (trimmedName.length > 255) {
    return { valid: false, error: 'Name is too long (max 255 characters)' }
  }

  return { valid: true }
}

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' }
  }

  const policy = validatePasswordPolicy(password)
  if (!policy.isValid) {
    return { valid: false, error: policy.errors[0] || 'Password does not meet the policy' }
  }

  return { valid: true }
}

function validateRole(role: string): { valid: boolean; error?: string } {
  const validRoles = ['admin', 'teacher', 'student', 'department_head', 'super_admin']

  if (!role || typeof role !== 'string') {
    return { valid: false, error: 'Role is required' }
  }

  if (!validRoles.includes(role)) {
    return { valid: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }
  }

  return { valid: true }
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin', 'super_admin'])
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    
    // Parse basic parameters
    const pageStr = searchParams.get('page') || '1'
    const limitStr = searchParams.get('limit') || '10'
    const page = Math.max(1, parseInt(pageStr, 10))
    const limit = Math.min(100, Math.max(1, parseInt(limitStr, 10)))
    
    const search = (searchParams.get('search') || '').trim()
    const roleFilter = (searchParams.get('role') || '').trim()
    const statusFilter = (searchParams.get('status') || '').trim()

    console.log('[GET /api/users] Params:', { page, limit, search, roleFilter, statusFilter})

    // Build base query
    let sql = 'SELECT id, email, name, role, isActive, createdAt FROM users'
    let params: any[] = []
    let countSql = 'SELECT COUNT(*) as total FROM users'

    // Add WHERE conditions if needed
    const filters: string[] = []
    
    if (search) {
      filters.push('(email LIKE ? OR name LIKE ?)')
      params.push(`%${search}%`, `%${search}%`)
    }

    if (roleFilter && roleFilter !== 'all') {
      const validRoles = ['admin', 'teacher', 'student', 'department_head', 'super_admin']
      if (!validRoles.includes(roleFilter)) {
        return NextResponse.json(
          { success: false, message: 'Invalid role filter' },
          { status: 400 }
        )
      }
      filters.push('role = ?')
      params.push(roleFilter)
    }

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter !== 'active' && statusFilter !== 'inactive') {
        return NextResponse.json(
          { success: false, message: 'Invalid status filter' },
          { status: 400 }
        )
      }
      filters.push('isActive = ?')
      params.push(statusFilter === 'active' ? 1 : 0)
    }

    // Add WHERE clause if any filters exist
    if (filters.length > 0) {
      const whereClause = ' WHERE ' + filters.join(' AND ')
      sql += whereClause
      countSql += whereClause
    }

    console.log('[GET /api/users] Count SQL:', countSql, 'Params:', params)

    // Get total count
    let total = 0
    try {
      const countResult = await dbQuery<any>(countSql, params)
      if (countResult && countResult.length > 0 && countResult[0]) {
        total = Number(countResult[0].total) || 0
      }
      console.log('[GET /api/users] Total:', total)
    } catch (err) {
      console.error('[GET /api/users] Count error:', err)
    }

    // Build and execute data query
    const offset = (page - 1) * limit
    // NOTE: LIMIT and OFFSET cannot be parameterized in MySQL prepared statements
    // So we concatenate them directly (they're validated safe integers)
    sql += ` ORDER BY createdAt DESC LIMIT ${limit} OFFSET ${offset}`

    console.log('[GET /api/users] Data SQL:', sql, 'Params:', params)

    const users = await dbQuery<DbUser>(sql, params)
    console.log('[GET /api/users] Users found:', users ? users.length : 0)

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: {
        users: (users || []).map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt
        })),
        total,
        page,
        limit,
        totalPages
      }
    })
  } catch (error) {
    console.error('[GET /api/users] FATAL ERROR:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const stack = error instanceof Error ? error.stack : ''
    return NextResponse.json(
      { 
        success: false, 
        message: message,
        stack: process.env.NODE_ENV === 'development' ? stack : undefined
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin', 'super_admin'])
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    const body = await request.json()
    const { email, name, password, role } = body

    // Validate email
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      return NextResponse.json(
        { success: false, message: emailValidation.error },
        { status: 400 }
      )
    }

    // Validate name
    const nameValidation = validateName(name)
    if (!nameValidation.valid) {
      return NextResponse.json(
        { success: false, message: nameValidation.error },
        { status: 400 }
      )
    }

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, message: passwordValidation.error },
        { status: 400 }
      )
    }

    // Validate role
    const roleValidation = validateRole(role)
    if (!roleValidation.valid) {
      return NextResponse.json(
        { success: false, message: roleValidation.error },
        { status: 400 }
      )
    }

    // Check if email already exists (case-insensitive)
    const trimmedEmail = email.trim()
    try {
      const existing = await dbQuery('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [trimmedEmail])
      if (existing.length > 0) {
        return NextResponse.json(
          { success: false, message: 'Email already exists. Please use a different email.' },
          { status: 409 }
        )
      }
    } catch (checkError) {
      console.error('Error checking duplicate email:', checkError)
      return NextResponse.json(
        { success: false, message: 'Failed to validate email uniqueness' },
        { status: 500 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Insert user
    try {
      await dbQuery(
        'INSERT INTO users (email, name, password, role, isActive) VALUES (?, ?, ?, ?, ?)',
        [trimmedEmail, name.trim(), hashedPassword, role, 1] // isActive = 1 (true)
      )
    } catch (insertError: any) {
      // MySQL duplicate key (unique email) -> 409 Conflict
      if (insertError && (insertError.code === 'ER_DUP_ENTRY' || insertError.errno === 1062)) {
        return NextResponse.json(
          { success: false, message: 'Email already exists. Please use a different email.' },
          { status: 409 }
        )
      }
      throw insertError
    }

    return NextResponse.json(
      { success: true, message: 'User created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating user:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create user'
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    )
  }
}
