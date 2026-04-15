import { NextRequest, NextResponse } from 'next/server'
import type { BookBorrow, BorrowsResponse, BorrowBookRequest, ReturnBookRequest } from '@/types/library'

// Mock borrows data
const mockBorrows: BookBorrow[] = [
  {
    id: "BR001",
    bookId: "B001",
    borrowerId: "ST001",
    borrowerName: "Ahmad Hassan",
    borrowerType: "student",
    borrowDate: "2024-09-20T10:00:00Z",
    dueDate: "2024-10-04T23:59:59Z",
    renewalCount: 0,
    maxRenewals: 2,
    status: "active",
    fineAmount: 0,
    notes: "Good condition when borrowed",
    issuedBy: "LIB001"
  },
  {
    id: "BR002",
    bookId: "B002",
    borrowerId: "ST002",
    borrowerName: "Fatima Ali",
    borrowerType: "student",
    borrowDate: "2024-09-18T14:30:00Z",
    dueDate: "2024-10-02T23:59:59Z",
    returnDate: "2024-09-25T16:20:00Z",
    renewalCount: 1,
    maxRenewals: 2,
    status: "returned",
    fineAmount: 0,
    notes: "Returned in excellent condition",
    issuedBy: "LIB001",
    returnedBy: "LIB002"
  },
  {
    id: "BR003",
    bookId: "B003",
    borrowerId: "TC001",
    borrowerName: "Dr. Omar Mohamed",
    borrowerType: "teacher",
    borrowDate: "2024-09-15T09:15:00Z",
    dueDate: "2024-09-29T23:59:59Z",
    renewalCount: 0,
    maxRenewals: 3,
    status: "overdue",
    fineAmount: 12.50,
    notes: "Extended loan for research",
    issuedBy: "LIB001"
  },
  {
    id: "BR004",
    bookId: "B004",
    borrowerId: "ST003",
    borrowerName: "Maryam Ahmed",
    borrowerType: "student",
    borrowDate: "2024-09-22T11:45:00Z",
    dueDate: "2024-10-06T23:59:59Z",
    renewalCount: 0,
    maxRenewals: 2,
    status: "active",
    fineAmount: 0,
    issuedBy: "LIB002"
  },
  {
    id: "BR005",
    bookId: "B005",
    borrowerId: "SF001",
    borrowerName: "Ali Ibrahim",
    borrowerType: "staff",
    borrowDate: "2024-09-19T13:20:00Z",
    dueDate: "2024-10-03T23:59:59Z",
    renewalCount: 1,
    maxRenewals: 3,
    status: "active",
    fineAmount: 0,
    notes: "Staff member - extended privileges",
    issuedBy: "LIB001"
  },
  {
    id: "BR006",
    bookId: "B006",
    borrowerId: "ST004",
    borrowerName: "Zainab Yusuf",
    borrowerType: "student",
    borrowDate: "2024-09-10T16:00:00Z",
    dueDate: "2024-09-24T23:59:59Z",
    renewalCount: 0,
    maxRenewals: 2,
    status: "overdue",
    fineAmount: 8.00,
    notes: "Late return - fine applied",
    issuedBy: "LIB002"
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const borrowerType = searchParams.get('borrowerType') || ''
    const overdue = searchParams.get('overdue') === 'true'

    let filteredBorrows = mockBorrows

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredBorrows = filteredBorrows.filter(borrow =>
        borrow.borrowerName.toLowerCase().includes(searchLower) ||
        borrow.borrowerId.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (status && status !== 'all') {
      filteredBorrows = filteredBorrows.filter(borrow => borrow.status === status)
    }

    // Apply borrower type filter
    if (borrowerType && borrowerType !== 'all') {
      filteredBorrows = filteredBorrows.filter(borrow => borrow.borrowerType === borrowerType)
    }

    // Apply overdue filter
    if (overdue) {
      filteredBorrows = filteredBorrows.filter(borrow => borrow.status === 'overdue')
    }

    // Calculate pagination
    const total = filteredBorrows.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedBorrows = filteredBorrows.slice(startIndex, endIndex)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    const response: BorrowsResponse = {
      borrows: paginatedBorrows,
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
    console.error('Error fetching borrows:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch borrows' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const borrowData: BorrowBookRequest = await request.json()
    
    // Validate required fields
    if (!borrowData.bookId || !borrowData.borrowerId || !borrowData.dueDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Book ID, borrower ID, and due date are required' 
        },
        { status: 400 }
      )
    }

    // Check if borrower already has this book
    const existingBorrow = mockBorrows.find(borrow => 
      borrow.bookId === borrowData.bookId && 
      borrow.borrowerId === borrowData.borrowerId && 
      borrow.status === 'active'
    )
    
    if (existingBorrow) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Borrower already has this book' 
        },
        { status: 409 }
      )
    }

    // Set max renewals based on borrower type
    const maxRenewals = borrowData.borrowerType === 'teacher' ? 3 
                       : borrowData.borrowerType === 'staff' ? 3 
                       : 2

    // Create new borrow record
    const newBorrow: BookBorrow = {
      id: `BR${(mockBorrows.length + 1).toString().padStart(3, '0')}`,
      ...borrowData,
      borrowerName: `Member ${borrowData.borrowerId}`, // In real app, this would be fetched from member data
      borrowDate: new Date().toISOString(),
      renewalCount: 0,
      maxRenewals,
      status: 'active',
      fineAmount: 0,
      issuedBy: 'LIB001' // This would come from the authenticated user
    }

    // Add to mock data (in real app, this would be saved to database)
    mockBorrows.push(newBorrow)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))

    return NextResponse.json({
      success: true,
      data: newBorrow,
      message: 'Book borrowed successfully'
    })
  } catch (error) {
    console.error('Error creating borrow:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to borrow book' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const returnData: ReturnBookRequest = await request.json()
    
    if (!returnData.borrowId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Borrow ID is required' 
        },
        { status: 400 }
      )
    }

    // Find borrow to return
    const borrowIndex = mockBorrows.findIndex(borrow => borrow.id === returnData.borrowId)
    if (borrowIndex === -1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Borrow record not found' 
        },
        { status: 404 }
      )
    }

    const borrow = mockBorrows[borrowIndex]
    if (borrow.status !== 'active' && borrow.status !== 'overdue') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Book is not currently borrowed' 
        },
        { status: 400 }
      )
    }

    // Calculate fine if overdue
    let fineAmount = returnData.fineAmount || 0
    if (!fineAmount) {
      const dueDate = new Date(borrow.dueDate)
      const returnDate = new Date(returnData.returnDate)
      if (returnDate > dueDate) {
        const daysOverdue = Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        fineAmount = daysOverdue * 2.5 // $2.50 per day
      }
    }

    // Update borrow record
    const updatedBorrow = {
      ...borrow,
      returnDate: returnData.returnDate,
      status: 'returned' as const,
      fineAmount,
      notes: returnData.notes ? `${borrow.notes || ''}. Return: ${returnData.notes}` : borrow.notes,
      returnedBy: 'LIB001' // This would come from the authenticated user
    }

    mockBorrows[borrowIndex] = updatedBorrow

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))

    return NextResponse.json({
      success: true,
      data: updatedBorrow,
      message: fineAmount > 0 
        ? `Book returned successfully. Fine of $${fineAmount.toFixed(2)} applied.`
        : 'Book returned successfully'
    })
  } catch (error) {
    console.error('Error returning book:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to return book' 
      },
      { status: 500 }
    )
  }
}