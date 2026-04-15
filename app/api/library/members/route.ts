import { NextRequest, NextResponse } from 'next/server'
import type { LibraryMember, MembersResponse, CreateMemberRequest, UpdateMemberRequest } from '@/types/library'

// Mock members data
const mockMembers: LibraryMember[] = [
  {
    id: "M001",
    name: "Ahmad Hassan",
    email: "ahmad.hassan@university.edu",
    phone: "+1-234-567-8901",
    type: "student",
    studentId: "ST001",
    department: "Computer Science",
    registrationDate: "2024-01-15T00:00:00Z",
    status: "active",
    maxBooksAllowed: 5,
    currentBooksCount: 2,
    totalFines: 0,
    address: "123 University Ave, City, State 12345"
  },
  {
    id: "M002",
    name: "Fatima Ali",
    email: "fatima.ali@university.edu",
    phone: "+1-234-567-8902",
    type: "student",
    studentId: "ST002",
    department: "Engineering",
    registrationDate: "2024-01-20T00:00:00Z",
    status: "active",
    maxBooksAllowed: 5,
    currentBooksCount: 1,
    totalFines: 0,
    address: "456 College St, City, State 12345"
  },
  {
    id: "M003",
    name: "Dr. Omar Mohamed",
    email: "omar.mohamed@university.edu",
    phone: "+1-234-567-8903",
    type: "teacher",
    employeeId: "TC001",
    department: "Computer Science",
    registrationDate: "2023-08-15T00:00:00Z",
    status: "active",
    maxBooksAllowed: 10,
    currentBooksCount: 3,
    totalFines: 12.50,
    address: "789 Faculty Row, City, State 12345"
  },
  {
    id: "M004",
    name: "Maryam Ahmed",
    email: "maryam.ahmed@university.edu",
    phone: "+1-234-567-8904",
    type: "student",
    studentId: "ST003",
    department: "Mathematics",
    registrationDate: "2024-02-10T00:00:00Z",
    status: "active",
    maxBooksAllowed: 5,
    currentBooksCount: 1,
    totalFines: 15.00,
    address: "321 Student Blvd, City, State 12345"
  },
  {
    id: "M005",
    name: "Ali Ibrahim",
    email: "ali.ibrahim@university.edu",
    phone: "+1-234-567-8905",
    type: "staff",
    employeeId: "SF001",
    department: "Administration",
    registrationDate: "2023-09-01T00:00:00Z",
    status: "active",
    maxBooksAllowed: 8,
    currentBooksCount: 2,
    totalFines: 0,
    address: "654 Staff Lane, City, State 12345"
  },
  {
    id: "M006",
    name: "Zainab Yusuf",
    email: "zainab.yusuf@university.edu",
    phone: "+1-234-567-8906",
    type: "student",
    studentId: "ST004",
    department: "Physics",
    registrationDate: "2024-01-25T00:00:00Z",
    status: "active",
    maxBooksAllowed: 5,
    currentBooksCount: 3,
    totalFines: 8.00,
    address: "987 Campus Drive, City, State 12345"
  },
  {
    id: "M007",
    name: "Hassan Omar",
    email: "hassan.omar@university.edu",
    phone: "+1-234-567-8907",
    type: "student",
    studentId: "ST005",
    department: "Business",
    registrationDate: "2024-03-01T00:00:00Z",
    status: "suspended",
    maxBooksAllowed: 5,
    currentBooksCount: 0,
    totalFines: 45.00,
    address: "159 Student Circle, City, State 12345"
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''
    const department = searchParams.get('department') || ''

    let filteredMembers = mockMembers

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredMembers = filteredMembers.filter(member =>
        member.name.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower) ||
        member.studentId?.toLowerCase().includes(searchLower) ||
        member.employeeId?.toLowerCase().includes(searchLower)
      )
    }

    // Apply type filter
    if (type && type !== 'all') {
      filteredMembers = filteredMembers.filter(member => member.type === type)
    }

    // Apply status filter
    if (status && status !== 'all') {
      filteredMembers = filteredMembers.filter(member => member.status === status)
    }

    // Apply department filter
    if (department && department !== 'all') {
      filteredMembers = filteredMembers.filter(member => member.department === department)
    }

    // Calculate pagination
    const total = filteredMembers.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedMembers = filteredMembers.slice(startIndex, endIndex)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    const response: MembersResponse = {
      members: paginatedMembers,
      total,
      page,
      limit,
      totalPages
    }

    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch members' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const memberData: CreateMemberRequest = await request.json()
    
    // Validate required fields
    if (!memberData.name || !memberData.email || !memberData.type) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Name, email, and type are required' 
        },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingMember = mockMembers.find(member => member.email === memberData.email)
    if (existingMember) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'A member with this email already exists' 
        },
        { status: 409 }
      )
    }

    // Set max books allowed based on member type
    const maxBooksAllowed = memberData.type === 'teacher' ? 10 
                           : memberData.type === 'staff' ? 8 
                           : 5

    // Create new member
    const newMember: LibraryMember = {
      id: `M${(mockMembers.length + 1).toString().padStart(3, '0')}`,
      ...memberData,
      registrationDate: new Date().toISOString(),
      status: 'active',
      maxBooksAllowed,
      currentBooksCount: 0,
      totalFines: 0
    }

    // Add to mock data (in real app, this would be saved to database)
    mockMembers.push(newMember)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))

    return NextResponse.json({
      success: true,
      data: newMember,
      message: 'Member created successfully'
    })
  } catch (error) {
    console.error('Error creating member:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create member' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const memberData: UpdateMemberRequest = await request.json()
    
    if (!memberData.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Member ID is required' 
        },
        { status: 400 }
      )
    }

    // Find member to update
    const memberIndex = mockMembers.findIndex(member => member.id === memberData.id)
    if (memberIndex === -1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Member not found' 
        },
        { status: 404 }
      )
    }

    // Update member
    const updatedMember = {
      ...mockMembers[memberIndex],
      ...memberData
    }

    mockMembers[memberIndex] = updatedMember

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))

    return NextResponse.json({
      success: true,
      data: updatedMember,
      message: 'Member updated successfully'
    })
  } catch (error) {
    console.error('Error updating member:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update member' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('id')
    
    if (!memberId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Member ID is required' 
        },
        { status: 400 }
      )
    }

    // Find member to delete
    const memberIndex = mockMembers.findIndex(member => member.id === memberId)
    if (memberIndex === -1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Member not found' 
        },
        { status: 404 }
      )
    }

    const member = mockMembers[memberIndex]
    
    // Check if member has active borrows
    if (member.currentBooksCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete member with active book borrows' 
        },
        { status: 400 }
      )
    }

    // Check if member has unpaid fines
    if (member.totalFines > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete member with unpaid fines' 
        },
        { status: 400 }
      )
    }

    // Remove member
    mockMembers.splice(memberIndex, 1)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    return NextResponse.json({
      success: true,
      message: 'Member deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting member:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete member' 
      },
      { status: 500 }
    )
  }
}