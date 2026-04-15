import { NextRequest, NextResponse } from 'next/server'
import type { Book, BooksResponse, CreateBookRequest, UpdateBookRequest } from '@/types/library'

// Mock books data
const mockBooks: Book[] = [
  {
    id: "B001",
    isbn: "978-0262033848",
    title: "Introduction to Algorithms",
    author: "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein",
    publisher: "MIT Press",
    publishedYear: 2009,
    category: "Computer Science",
    subcategory: "Algorithms",
    description: "A comprehensive textbook on computer algorithms covering a broad range of algorithms in depth, yet making their design and analysis accessible to all levels of readers.",
    edition: "3rd Edition",
    pages: 1312,
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
    lastUpdated: "2024-09-26T10:30:00Z",
    tags: ["algorithms", "computer science", "programming", "data structures"]
  },
  {
    id: "B002",
    isbn: "978-0073523323",
    title: "Database System Concepts",
    author: "Abraham Silberschatz, Henry F. Korth, S. Sudarshan",
    publisher: "McGraw-Hill Education",
    publishedYear: 2019,
    category: "Computer Science",
    subcategory: "Database Systems",
    description: "Comprehensive introduction to database systems, covering both the theoretical foundations and practical applications.",
    edition: "7th Edition",
    pages: 1376,
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
    lastUpdated: "2024-09-25T14:20:00Z",
    tags: ["database", "sql", "data management", "computer science"]
  },
  {
    id: "B003",
    isbn: "978-0136042594",
    title: "Artificial Intelligence: A Modern Approach",
    author: "Stuart Russell, Peter Norvig",
    publisher: "Pearson",
    publishedYear: 2020,
    category: "Computer Science",
    subcategory: "Artificial Intelligence",
    description: "The leading textbook in artificial intelligence, covering intelligent agents, problem-solving, knowledge representation, and machine learning.",
    edition: "4th Edition",
    pages: 1136,
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
    lastUpdated: "2024-09-26T09:15:00Z",
    tags: ["artificial intelligence", "machine learning", "ai", "computer science"]
  },
  {
    id: "B004",
    isbn: "978-0132350884",
    title: "Clean Code: A Handbook of Agile Software Craftsmanship",
    author: "Robert C. Martin",
    publisher: "Prentice Hall",
    publishedYear: 2008,
    category: "Computer Science",
    subcategory: "Software Engineering",
    description: "A handbook of agile software craftsmanship focused on writing clean, maintainable code.",
    edition: "1st Edition",
    pages: 464,
    language: "English",
    location: "CS-C1-08",
    totalCopies: 12,
    availableCopies: 9,
    borrowedCopies: 3,
    reservedCopies: 0,
    price: 44.99,
    condition: "good",
    status: "available",
    addedDate: "2024-01-20T00:00:00Z",
    lastUpdated: "2024-09-24T16:45:00Z",
    tags: ["clean code", "software engineering", "programming", "best practices"]
  },
  {
    id: "B005",
    isbn: "978-0321573513",
    title: "Algorithms",
    author: "Robert Sedgewick, Kevin Wayne",
    publisher: "Addison-Wesley Professional",
    publishedYear: 2011,
    category: "Computer Science",
    subcategory: "Algorithms",
    description: "Essential information that every serious programmer needs to know about algorithms and data structures.",
    edition: "4th Edition",
    pages: 976,
    language: "English",
    location: "CS-A1-15",
    totalCopies: 7,
    availableCopies: 4,
    borrowedCopies: 3,
    reservedCopies: 0,
    price: 74.99,
    condition: "excellent",
    status: "available",
    addedDate: "2024-02-15T00:00:00Z",
    lastUpdated: "2024-09-23T11:20:00Z",
    tags: ["algorithms", "data structures", "java", "programming"]
  },
  {
    id: "B006",
    isbn: "978-0134685991",
    title: "Effective Java",
    author: "Joshua Bloch",
    publisher: "Addison-Wesley Professional",
    publishedYear: 2017,
    category: "Computer Science",
    subcategory: "Programming Languages",
    description: "The definitive guide to writing effective, elegant Java code with 90 proven techniques.",
    edition: "3rd Edition",
    pages: 412,
    language: "English",
    location: "CS-C2-03",
    totalCopies: 8,
    availableCopies: 6,
    borrowedCopies: 2,
    reservedCopies: 0,
    price: 54.99,
    condition: "good",
    status: "available",
    addedDate: "2024-03-10T00:00:00Z",
    lastUpdated: "2024-09-22T09:30:00Z",
    tags: ["java", "programming", "best practices", "software development"]
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const status = searchParams.get('status') || ''
    const availability = searchParams.get('availability') || ''

    let filteredBooks = mockBooks

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredBooks = filteredBooks.filter(book =>
        book.title.toLowerCase().includes(searchLower) ||
        book.author.toLowerCase().includes(searchLower) ||
        book.isbn.includes(search) ||
        book.publisher.toLowerCase().includes(searchLower)
      )
    }

    // Apply category filter
    if (category && category !== 'all') {
      filteredBooks = filteredBooks.filter(book => book.category === category)
    }

    // Apply status filter
    if (status && status !== 'all') {
      filteredBooks = filteredBooks.filter(book => book.status === status)
    }

    // Apply availability filter
    if (availability && availability !== 'all') {
      if (availability === 'available') {
        filteredBooks = filteredBooks.filter(book => book.availableCopies > 0)
      } else if (availability === 'unavailable') {
        filteredBooks = filteredBooks.filter(book => book.availableCopies === 0)
      }
    }

    // Calculate pagination
    const total = filteredBooks.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedBooks = filteredBooks.slice(startIndex, endIndex)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    const response: BooksResponse = {
      books: paginatedBooks,
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
    console.error('Error fetching books:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch books' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const bookData: CreateBookRequest = await request.json()
    
    // Validate required fields
    if (!bookData.title || !bookData.author || !bookData.isbn) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Title, author, and ISBN are required' 
        },
        { status: 400 }
      )
    }

    // Check if ISBN already exists
    const existingBook = mockBooks.find(book => book.isbn === bookData.isbn)
    if (existingBook) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'A book with this ISBN already exists' 
        },
        { status: 409 }
      )
    }

    // Create new book
    const newBook: Book = {
      id: `B${(mockBooks.length + 1).toString().padStart(3, '0')}`,
      ...bookData,
      availableCopies: bookData.totalCopies,
      borrowedCopies: 0,
      reservedCopies: 0,
      status: 'available',
      addedDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }

    // Add to mock data (in real app, this would be saved to database)
    mockBooks.push(newBook)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))

    return NextResponse.json({
      success: true,
      data: newBook,
      message: 'Book created successfully'
    })
  } catch (error) {
    console.error('Error creating book:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create book' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const bookData: UpdateBookRequest = await request.json()
    
    if (!bookData.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Book ID is required' 
        },
        { status: 400 }
      )
    }

    // Find book to update
    const bookIndex = mockBooks.findIndex(book => book.id === bookData.id)
    if (bookIndex === -1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Book not found' 
        },
        { status: 404 }
      )
    }

    // Update book
    const updatedBook = {
      ...mockBooks[bookIndex],
      ...bookData,
      lastUpdated: new Date().toISOString()
    }

    mockBooks[bookIndex] = updatedBook

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))

    return NextResponse.json({
      success: true,
      data: updatedBook,
      message: 'Book updated successfully'
    })
  } catch (error) {
    console.error('Error updating book:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update book' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookId = searchParams.get('id')
    
    if (!bookId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Book ID is required' 
        },
        { status: 400 }
      )
    }

    // Find book to delete
    const bookIndex = mockBooks.findIndex(book => book.id === bookId)
    if (bookIndex === -1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Book not found' 
        },
        { status: 404 }
      )
    }

    // Check if book is currently borrowed
    const book = mockBooks[bookIndex]
    if (book.borrowedCopies > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete book that is currently borrowed' 
        },
        { status: 400 }
      )
    }

    // Remove book
    mockBooks.splice(bookIndex, 1)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    return NextResponse.json({
      success: true,
      message: 'Book deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting book:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete book' 
      },
      { status: 500 }
    )
  }
}