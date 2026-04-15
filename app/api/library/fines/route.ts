import { NextRequest, NextResponse } from 'next/server'
import type { LibraryFine, FinesResponse, CreateFineRequest, PayFineRequest } from '@/types/library'

// Mock fines data
const mockFines: LibraryFine[] = [
  {
    id: "F001",
    memberId: "M003",
    memberName: "Dr. Omar Mohamed",
    borrowId: "BR003",
    bookId: "B003",
    bookTitle: "Artificial Intelligence: A Modern Approach",
    fineType: "overdue",
    amount: 12.50,
    description: "Book returned 5 days late",
    issueDate: "2024-09-24T00:00:00Z",
    dueDate: "2024-10-08T23:59:59Z",
    status: "pending",
    issuedBy: "LIB001"
  },
  {
    id: "F002",
    memberId: "M004",
    memberName: "Maryam Ahmed",
    borrowId: "BR007",
    bookId: "B007",
    bookTitle: "Data Structures and Algorithms",
    fineType: "overdue",
    amount: 15.00,
    description: "Book returned 6 days late",
    issueDate: "2024-09-20T00:00:00Z",
    dueDate: "2024-10-04T23:59:59Z",
    paidDate: "2024-09-25T14:30:00Z",
    status: "paid",
    issuedBy: "LIB002",
    paidTo: "LIB001"
  },
  {
    id: "F003",
    memberId: "M006",
    memberName: "Zainab Yusuf",
    borrowId: "BR006",
    bookId: "B006",
    bookTitle: "Effective Java",
    fineType: "overdue",
    amount: 8.00,
    description: "Book returned 4 days late",
    issueDate: "2024-09-22T00:00:00Z",
    dueDate: "2024-10-06T23:59:59Z",
    status: "pending",
    issuedBy: "LIB002"
  },
  {
    id: "F004",
    memberId: "M007",
    memberName: "Hassan Omar",
    borrowId: "BR008",
    bookId: "B008",
    bookTitle: "Business Management Principles",
    fineType: "lost",
    amount: 45.00,
    description: "Book reported as lost by member",
    issueDate: "2024-09-15T00:00:00Z",
    status: "pending",
    issuedBy: "LIB001"
  },
  {
    id: "F005",
    memberId: "M002",
    memberName: "Fatima Ali",
    borrowId: "BR009",
    bookId: "B009",
    bookTitle: "Linear Algebra and Its Applications",
    fineType: "damage",
    amount: 25.00,
    description: "Book returned with water damage to pages 45-60",
    issueDate: "2024-09-18T00:00:00Z",
    dueDate: "2024-10-02T23:59:59Z",
    paidDate: "2024-09-26T10:15:00Z",
    status: "paid",
    issuedBy: "LIB001",
    paidTo: "LIB002"
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const fineType = searchParams.get('fineType') || ''
    const memberId = searchParams.get('memberId') || ''

    let filteredFines = mockFines

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredFines = filteredFines.filter(fine =>
        fine.memberName.toLowerCase().includes(searchLower) ||
        fine.bookTitle.toLowerCase().includes(searchLower) ||
        fine.memberId.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (status && status !== 'all') {
      filteredFines = filteredFines.filter(fine => fine.status === status)
    }

    // Apply fine type filter
    if (fineType && fineType !== 'all') {
      filteredFines = filteredFines.filter(fine => fine.fineType === fineType)
    }

    // Apply member filter
    if (memberId) {
      filteredFines = filteredFines.filter(fine => fine.memberId === memberId)
    }

    // Calculate pagination
    const total = filteredFines.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedFines = filteredFines.slice(startIndex, endIndex)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    const response: FinesResponse = {
      fines: paginatedFines,
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
    console.error('Error fetching fines:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch fines' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const fineData: CreateFineRequest = await request.json()
    
    // Validate required fields
    if (!fineData.memberId || !fineData.amount || !fineData.fineType || !fineData.description) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Member ID, amount, fine type, and description are required' 
        },
        { status: 400 }
      )
    }

    // Create new fine
    const newFine: LibraryFine = {
      id: `F${(mockFines.length + 1).toString().padStart(3, '0')}`,
      ...fineData,
      borrowId: fineData.borrowId || `BR${Date.now()}`, // Provide default if not specified
      bookId: fineData.bookId || `B${Date.now()}`, // Provide default if not specified
      memberName: `Member ${fineData.memberId}`, // In real app, this would be fetched from member data
      bookTitle: fineData.bookId ? `Book ${fineData.bookId}` : 'General Fine', // In real app, this would be fetched from book data
      issueDate: new Date().toISOString(),
      status: 'pending',
      issuedBy: 'LIB001' // This would come from the authenticated user
    }

    // Add to mock data (in real app, this would be saved to database)
    mockFines.push(newFine)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))

    return NextResponse.json({
      success: true,
      data: newFine,
      message: 'Fine created successfully'
    })
  } catch (error) {
    console.error('Error creating fine:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create fine' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const paymentData: PayFineRequest = await request.json()
    
    if (!paymentData.fineId || !paymentData.amount) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Fine ID and amount are required' 
        },
        { status: 400 }
      )
    }

    // Find fine to pay
    const fineIndex = mockFines.findIndex(fine => fine.id === paymentData.fineId)
    if (fineIndex === -1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Fine not found' 
        },
        { status: 404 }
      )
    }

    const fine = mockFines[fineIndex]
    if (fine.status !== 'pending') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Fine is not in pending status' 
        },
        { status: 400 }
      )
    }

    if (paymentData.amount < fine.amount) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment amount is less than fine amount' 
        },
        { status: 400 }
      )
    }

    // Update fine record
    const updatedFine = {
      ...fine,
      paidDate: new Date().toISOString(),
      status: 'paid' as const,
      paidTo: 'LIB001' // This would come from the authenticated user
    }

    mockFines[fineIndex] = updatedFine

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))

    return NextResponse.json({
      success: true,
      data: updatedFine,
      message: 'Fine paid successfully'
    })
  } catch (error) {
    console.error('Error paying fine:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to pay fine' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fineId = searchParams.get('id')
    const waiveReason = searchParams.get('waiveReason') || 'Waived by administrator'
    
    if (!fineId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Fine ID is required' 
        },
        { status: 400 }
      )
    }

    // Find fine to waive
    const fineIndex = mockFines.findIndex(fine => fine.id === fineId)
    if (fineIndex === -1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Fine not found' 
        },
        { status: 404 }
      )
    }

    const fine = mockFines[fineIndex]
    if (fine.status !== 'pending') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Only pending fines can be waived' 
        },
        { status: 400 }
      )
    }

    // Update fine record to waived
    const updatedFine = {
      ...fine,
      status: 'waived' as const,
      waiveReason,
      paidDate: new Date().toISOString()
    }

    mockFines[fineIndex] = updatedFine

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    return NextResponse.json({
      success: true,
      data: updatedFine,
      message: 'Fine waived successfully'
    })
  } catch (error) {
    console.error('Error waiving fine:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to waive fine' 
      },
      { status: 500 }
    )
  }
}