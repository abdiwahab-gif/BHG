import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// Mock database
const gradingSystems: any[] = [
  {
    id: "1",
    name: "Standard 4.0 GPA",
    type: "gpa_4",
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    name: "Percentage System",
    type: "percentage",
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    name: "Letter Grade System",
    type: "letter",
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const gradeMappings: any[] = [
  // Standard 4.0 GPA mappings
  {
    id: "1",
    gradingSystemId: "1",
    minScore: 90,
    maxScore: 100,
    letterGrade: "A+",
    gradePoint: 4.0,
    description: "Excellent",
    isPassingGrade: true,
  },
  {
    id: "2",
    gradingSystemId: "1",
    minScore: 85,
    maxScore: 89,
    letterGrade: "A",
    gradePoint: 4.0,
    description: "Excellent",
    isPassingGrade: true,
  },
  {
    id: "3",
    gradingSystemId: "1",
    minScore: 80,
    maxScore: 84,
    letterGrade: "A-",
    gradePoint: 3.7,
    description: "Very Good",
    isPassingGrade: true,
  },
  {
    id: "4",
    gradingSystemId: "1",
    minScore: 75,
    maxScore: 79,
    letterGrade: "B+",
    gradePoint: 3.3,
    description: "Good",
    isPassingGrade: true,
  },
  {
    id: "5",
    gradingSystemId: "1",
    minScore: 70,
    maxScore: 74,
    letterGrade: "B",
    gradePoint: 3.0,
    description: "Good",
    isPassingGrade: true,
  },
  {
    id: "6",
    gradingSystemId: "1",
    minScore: 65,
    maxScore: 69,
    letterGrade: "B-",
    gradePoint: 2.7,
    description: "Satisfactory",
    isPassingGrade: true,
  },
  {
    id: "7",
    gradingSystemId: "1",
    minScore: 60,
    maxScore: 64,
    letterGrade: "C+",
    gradePoint: 2.3,
    description: "Satisfactory",
    isPassingGrade: true,
  },
  {
    id: "8",
    gradingSystemId: "1",
    minScore: 55,
    maxScore: 59,
    letterGrade: "C",
    gradePoint: 2.0,
    description: "Acceptable",
    isPassingGrade: true,
  },
  {
    id: "9",
    gradingSystemId: "1",
    minScore: 50,
    maxScore: 54,
    letterGrade: "C-",
    gradePoint: 1.7,
    description: "Acceptable",
    isPassingGrade: true,
  },
  {
    id: "10",
    gradingSystemId: "1",
    minScore: 0,
    maxScore: 49,
    letterGrade: "F",
    gradePoint: 0.0,
    description: "Fail",
    isPassingGrade: false,
  },
]

let nextId = 4

const gradingSystemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["letter", "percentage", "gpa_4", "gpa_5"]),
  departmentId: z.string().optional(),
  programId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get("departmentId")
    const programId = searchParams.get("programId")

    let filteredSystems = gradingSystems

    if (departmentId) {
      filteredSystems = filteredSystems.filter((system) => system.departmentId === departmentId || !system.departmentId)
    }

    if (programId) {
      filteredSystems = filteredSystems.filter((system) => system.programId === programId || !system.programId)
    }

    return NextResponse.json({
      success: true,
      data: filteredSystems,
    })
  } catch (error) {
    console.error("Error fetching grading systems:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch grading systems" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = gradingSystemSchema.parse(body)

    const newSystem = {
      id: nextId.toString(),
      ...validatedData,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    gradingSystems.push(newSystem)
    nextId++

    return NextResponse.json({
      success: true,
      data: newSystem,
      message: "Grading system created successfully",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Validation failed", details: error.errors }, { status: 400 })
    }

    console.error("Error creating grading system:", error)
    return NextResponse.json({ success: false, error: "Failed to create grading system" }, { status: 500 })
  }
}
