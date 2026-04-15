import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params

    // In a real application, you would delete from database
    // For now, we'll just return success
    console.log(`Deleting ID card with id: ${id}`)

    return NextResponse.json({ 
      success: true, 
      message: "ID card deleted successfully" 
    })
  } catch (error) {
    console.error("Error deleting ID card:", error)
    return NextResponse.json(
      { error: "Failed to delete ID card" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params

    // In a real application, you would fetch from database
    // For now, we'll return mock data
    const mockCard = {
      id: id,
      type: "student" as const,
      cardNumber: `AU-STU-2024-${id.slice(-3)}`,
      personId: `person-${id}`,
      personName: "Sample Student",
      department: "Computer Science",
      program: "Bachelor of Computer Science",
      photo: "/diverse-female-student.png",
      issueDate: "2024-01-15",
      expiryDate: "2028-01-15",
      qrCodeData: JSON.stringify({
        id: `AU-STU-2024-${id.slice(-3)}`,
        name: "Sample Student",
        department: "Computer Science",
        type: "student",
        valid: "2028-01-15"
      }),
      status: "active" as const,
      issuedBy: "Registrar Office",
      academicYear: "2024-2025"
    }

    return NextResponse.json(mockCard)
  } catch (error) {
    console.error("Error fetching ID card:", error)
    return NextResponse.json(
      { error: "Failed to fetch ID card" },
      { status: 500 }
    )
  }
}