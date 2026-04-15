import { type NextRequest, NextResponse } from "next/server"
import type { IDCard } from "@/types/id-cards"

// Mock data - in real app, this would be in database
const mockIDCards: IDCard[] = [
  {
    id: "card-1",
    type: "student",
    cardNumber: "AU-STU-2024-001",
    personId: "student-1",
    personName: "Alice Johnson",
    department: "Computer Science",
    program: "Bachelor of Computer Science",
    photo: "/diverse-female-student.png",
    issueDate: "2024-01-15",
    expiryDate: "2028-01-15",
    qrCodeData: JSON.stringify({
      id: "AU-STU-2024-001",
      name: "Alice Johnson",
      department: "Computer Science",
      type: "student",
      valid: "2028-01-15"
    }),
    status: "active",
    issuedBy: "Registrar Office",
    academicYear: "2024-2025"
  },
  {
    id: "card-2",
    type: "student",
    cardNumber: "AU-STU-2024-002",
    personId: "student-2",
    personName: "Bob Wilson",
    department: "Business Administration",
    program: "Bachelor of Business Administration",
    photo: "/placeholder-user.jpg",
    issueDate: "2024-01-20",
    expiryDate: "2028-01-20",
    qrCodeData: JSON.stringify({
      id: "AU-STU-2024-002",
      name: "Bob Wilson",
      department: "Business Administration",
      type: "student",
      valid: "2028-01-20"
    }),
    status: "active",
    issuedBy: "Registrar Office",
    academicYear: "2024-2025"
  },
  {
    id: "card-3",
    type: "staff",
    cardNumber: "AU-STF-2024-001",
    personId: "teacher-1",
    personName: "Dr. John Smith",
    department: "Computer Science",
    position: "Associate Professor",
    photo: "/professional-teacher-portrait.png",
    issueDate: "2024-01-10",
    expiryDate: "2029-01-10",
    qrCodeData: JSON.stringify({
      id: "AU-STF-2024-001",
      name: "Dr. John Smith",
      department: "Computer Science",
      type: "staff",
      position: "Associate Professor",
      valid: "2029-01-10"
    }),
    status: "active",
    issuedBy: "HR Department"
  },
  {
    id: "card-4",
    type: "staff",
    cardNumber: "AU-STF-2024-002",
    personId: "teacher-2",
    personName: "Dr. Sarah Johnson",
    department: "Biology",
    position: "Assistant Professor",
    photo: "/female-teacher-portrait.png",
    issueDate: "2024-01-12",
    expiryDate: "2029-01-12",
    qrCodeData: JSON.stringify({
      id: "AU-STF-2024-002",
      name: "Dr. Sarah Johnson",
      department: "Biology",
      type: "staff",
      position: "Assistant Professor",
      valid: "2029-01-12"
    }),
    status: "active",
    issuedBy: "HR Department"
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const department = searchParams.get("department")
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    let filteredCards = [...mockIDCards]

    // Filter by type
    if (type && type !== "all") {
      filteredCards = filteredCards.filter(card => card.type === type)
    }

    // Filter by department
    if (department && department !== "all") {
      filteredCards = filteredCards.filter(card => card.department === department)
    }

    // Filter by status
    if (status && status !== "all") {
      filteredCards = filteredCards.filter(card => card.status === status)
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredCards = filteredCards.filter(card =>
        card.personName.toLowerCase().includes(searchLower) ||
        card.cardNumber.toLowerCase().includes(searchLower) ||
        card.department.toLowerCase().includes(searchLower)
      )
    }

    // Check expiry status and update
    const now = new Date()
    filteredCards = filteredCards.map(card => ({
      ...card,
      status: new Date(card.expiryDate) < now ? 'expired' : card.status
    }))

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedCards = filteredCards.slice(startIndex, endIndex)

    return NextResponse.json({
      cards: paginatedCards,
      total: filteredCards.length,
      page,
      limit,
    })
  } catch (error) {
    console.error("Error fetching ID cards:", error)
    return NextResponse.json(
      { error: "Failed to fetch ID cards" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      type,
      personId,
      department,
      program,
      position,
      academicYear,
      validityPeriod = type === 'student' ? 4 : 5
    } = await request.json()

    if (!type || !personId || !department) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Get person details (mock data lookup)
    const mockStudents = [
      { id: "student-1", firstName: "Alice", lastName: "Johnson", photo: "/diverse-female-student.png" },
      { id: "student-2", firstName: "Bob", lastName: "Wilson", photo: "/placeholder-user.jpg" },
      { id: "student-3", firstName: "Carol", lastName: "Davis", photo: "/diverse-student-girl.png" },
    ]
    
    const mockTeachers = [
      { id: "teacher-1", firstName: "Dr. John", lastName: "Smith", photo: "/professional-teacher-portrait.png" },
      { id: "teacher-2", firstName: "Dr. Sarah", lastName: "Johnson", photo: "/female-teacher-portrait.png" },
    ]

    const persons = type === 'student' ? mockStudents : mockTeachers
    const person = persons.find(p => p.id === personId)

    if (!person) {
      return NextResponse.json(
        { error: "Person not found" },
        { status: 404 }
      )
    }

    const issueDate = new Date()
    const expiryDate = new Date(issueDate)
    expiryDate.setFullYear(expiryDate.getFullYear() + validityPeriod)

    const cardNumber = `AU-${type.toUpperCase().substring(0, 3)}-${issueDate.getFullYear()}-${String(mockIDCards.length + 1).padStart(3, '0')}`

    const qrCodeData = JSON.stringify({
      id: cardNumber,
      name: `${person.firstName} ${person.lastName}`,
      department,
      type,
      ...(type === 'student' ? { program } : { position }),
      valid: expiryDate.toISOString().split('T')[0]
    })

    const newCard: IDCard = {
      id: `card-${Date.now()}`,
      type,
      cardNumber,
      personId,
      personName: `${person.firstName} ${person.lastName}`,
      department,
      ...(type === 'student' ? { program, academicYear } : { position }),
      photo: person.photo,
      issueDate: issueDate.toISOString().split('T')[0],
      expiryDate: expiryDate.toISOString().split('T')[0],
      qrCodeData,
      status: "active",
      issuedBy: type === 'student' ? "Registrar Office" : "HR Department"
    }

    // Add to mock data (in real app, save to database)
    mockIDCards.push(newCard)

    return NextResponse.json({
      message: "ID card created successfully",
      card: newCard,
    })
  } catch (error) {
    console.error("Error creating ID card:", error)
    return NextResponse.json(
      { error: "Failed to create ID card" },
      { status: 500 }
    )
  }
}