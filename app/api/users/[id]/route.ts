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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = requireRole(request, ['admin', 'super_admin'])
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    const { id } = params

    const users = await dbQuery<DbUser>(
      'SELECT id, email, name, role, isActive, createdAt FROM users WHERE id = ?',
      [id]
    )

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: users[0]
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = requireRole(request, ['admin', 'super_admin'])
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    const { id } = params
    const { email, name, role, isActive, password } = await request.json()

    // Check if user exists
    const existing = await dbQuery('SELECT id FROM users WHERE id = ?', [id])
    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

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

    // Validate role
    const roleValidation = validateRole(role)
    if (!roleValidation.valid) {
      return NextResponse.json(
        { success: false, message: roleValidation.error },
        { status: 400 }
      )
    }

    // Check if email is taken by another user
    const trimmedEmail = email.trim()
    try {
      const emailCheck = await dbQuery(
        'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?',
        [trimmedEmail, id]
      )
      if (emailCheck.length > 0) {
        return NextResponse.json(
          { success: false, message: 'Email already exists. Please use a different email.' },
          { status: 409 }
        )
      }
    } catch (checkError) {
      console.error('Error checking email:', checkError)
      return NextResponse.json(
        { success: false, message: 'Failed to validate email uniqueness' },
        { status: 500 }
      )
    }

    // Build update query
    let query = 'UPDATE users SET email = ?, name = ?, role = ?, isActive = ?'
    const updateParams: any[] = [
      trimmedEmail, 
      name.trim(), 
      role, 
      isActive ? 1 : 0  // Convert boolean to 0/1 for MySQL
    ]

    // Update password if provided
    if (password) {
      const passwordValidation = validatePassword(password)
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { success: false, message: passwordValidation.error },
          { status: 400 }
        )
      }

      const hashedPassword = await bcrypt.hash(password, 10)
      query += ', password = ?'
      updateParams.push(hashedPassword)
    }

    query += ' WHERE id = ?'
    updateParams.push(id)

    await dbQuery(query, updateParams)

    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    })
  } catch (error) {
    console.error('Error updating user:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update user'
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = requireRole(request, ['admin', 'super_admin'])
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    const { id } = params

    // Check if user exists
    const existing = await dbQuery('SELECT id FROM users WHERE id = ?', [id])
    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    await dbQuery('DELETE FROM users WHERE id = ?', [id])

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
