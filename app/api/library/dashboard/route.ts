import { NextRequest, NextResponse } from 'next/server'
import type { LibraryStats, LibraryActivity, Book } from '@/types/library'

// Mock data for library dashboard
const mockLibraryStats: LibraryStats = {
  totalBooks: 12500,
  totalMembers: 2340,
  activeBorrows: 1847,
  overdueBorrows: 134,
  totalReservations: 89,
  availableBooks: 10653,
  borrowedBooks: 1847,
  membershipStats: {
    students: 1890,
    teachers: 340,
    staff: 110
  },
  categoryStats: [
    { category: "Computer Science", count: 1250 },
    { category: "Engineering", count: 1100 },
    { category: "Mathematics", count: 890 },
    { category: "Physics", count: 780 },
    { category: "Literature", count: 650 },
    { category: "History", count: 580 },
    { category: "Business", count: 520 },
    { category: "Medicine", count: 450 }
  ],
  recentActivities: [
    {
      id: "1",
      type: "borrow",
      description: "Ahmad Hassan borrowed 'Introduction to Algorithms'",
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      memberId: "M001",
      memberName: "Ahmad Hassan",
      bookId: "B001",
      bookTitle: "Introduction to Algorithms"
    },
    {
      id: "2",
      type: "return",
      description: "Fatima Ali returned 'Database Systems Concepts'",
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      memberId: "M002",
      memberName: "Fatima Ali",
      bookId: "B002",
      bookTitle: "Database Systems Concepts"
    },
    {
      id: "3",
      type: "reserve",
      description: "Omar Mohamed reserved 'Artificial Intelligence: A Modern Approach'",
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      memberId: "M003",
      memberName: "Omar Mohamed",
      bookId: "B003",
      bookTitle: "Artificial Intelligence: A Modern Approach"
    },
    {
      id: "4",
      type: "add_book",
      description: "New book 'Clean Code' added to collection",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      bookId: "B004",
      bookTitle: "Clean Code"
    },
    {
      id: "5",
      type: "fine_paid",
      description: "Maryam Ahmed paid overdue fine of $15.00",
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      memberId: "M004",
      memberName: "Maryam Ahmed",
      details: "$15.00"
    }
  ],
  popularBooks: [
    {
      book: {
        id: "B001",
        isbn: "978-0262033848",
        title: "Introduction to Algorithms",
        author: "Thomas H. Cormen",
        publisher: "MIT Press",
        publishedYear: 2009,
        category: "Computer Science",
        description: "A comprehensive textbook on computer algorithms",
        language: "English",
        location: "CS-A1-01",
        totalCopies: 10,
        availableCopies: 7,
        borrowedCopies: 3,
        reservedCopies: 0,
        price: 89.99,
        condition: "good",
        status: "available",
        addedDate: "2024-01-15T00:00:00Z",
        lastUpdated: "2024-09-26T10:30:00Z"
      },
      borrowCount: 156
    },
    {
      book: {
        id: "B002",
        isbn: "978-0073523323",
        title: "Database System Concepts",
        author: "Abraham Silberschatz",
        publisher: "McGraw-Hill",
        publishedYear: 2019,
        category: "Computer Science",
        description: "Comprehensive introduction to database systems",
        language: "English",
        location: "CS-A2-05",
        totalCopies: 8,
        availableCopies: 5,
        borrowedCopies: 3,
        reservedCopies: 0,
        price: 79.99,
        condition: "excellent",
        status: "available",
        addedDate: "2024-02-10T00:00:00Z",
        lastUpdated: "2024-09-25T14:20:00Z"
      },
      borrowCount: 134
    },
    {
      book: {
        id: "B003",
        isbn: "978-0136042594",
        title: "Artificial Intelligence: A Modern Approach",
        author: "Stuart Russell",
        publisher: "Pearson",
        publishedYear: 2020,
        category: "Computer Science",
        description: "Leading textbook in artificial intelligence",
        language: "English",
        location: "CS-B1-12",
        totalCopies: 6,
        availableCopies: 2,
        borrowedCopies: 3,
        reservedCopies: 1,
        price: 94.99,
        condition: "excellent",
        status: "available",
        addedDate: "2024-03-05T00:00:00Z",
        lastUpdated: "2024-09-26T09:15:00Z"
      },
      borrowCount: 128
    }
  ]
}

export async function GET(request: NextRequest) {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return NextResponse.json({
      success: true,
      data: mockLibraryStats
    })
  } catch (error) {
    console.error('Error fetching library dashboard data:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch library dashboard data' 
      },
      { status: 500 }
    )
  }
}