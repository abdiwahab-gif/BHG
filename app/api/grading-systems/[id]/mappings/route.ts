import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// Mock database
const gradeMappings: any[] = [
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

let nextMappingId = 11

const gradeMappingSchema = z.object({
  minScore: z.number().min(0).max(100),
  maxScore: z.number().min(0).max(100),
  letterGrade: z.string().optional(),
  gradePoint: z.number().min(0),
  description: z.string().min(1, "Description is required"),
  isPassingGrade: z.boolean(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const mappings = gradeMappings
      .filter((mapping) => mapping.gradingSystemId === params.id)
      .sort((a, b) => b.minScore - a.minScore) // Sort by minScore descending

    return NextResponse.json({
      success: true,
      data: mappings,
    })
  } catch (error) {
    console.error("Error fetching grade mappings:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch grade mappings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const validatedData = gradeMappingSchema.parse(body)

    // Validate score range
    if (validatedData.minScore >= validatedData.maxScore) {
      return NextResponse.json(
        { success: false, error: "Minimum score must be less than maximum score" },
        { status: 400 },
      )
    }

    // Check for overlapping ranges
    const existingMappings = gradeMappings.filter((mapping) => mapping.gradingSystemId === params.id)
    const hasOverlap = existingMappings.some((mapping) => {
      return (
        (validatedData.minScore >= mapping.minScore && validatedData.minScore <= mapping.maxScore) ||
        (validatedData.maxScore >= mapping.minScore && validatedData.maxScore <= mapping.maxScore) ||
        (validatedData.minScore <= mapping.minScore && validatedData.maxScore >= mapping.maxScore)
      )
    })

    if (hasOverlap) {
      return NextResponse.json({ success: false, error: "Score range overlaps with existing mapping" }, { status: 400 })
    }

    const newMapping = {
      id: nextMappingId.toString(),
      gradingSystemId: params.id,
      ...validatedData,
    }

    gradeMappings.push(newMapping)
    nextMappingId++

    return NextResponse.json({
      success: true,
      data: newMapping,
      message: "Grade mapping created successfully",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Validation failed", details: error.errors }, { status: 400 })
    }

    console.error("Error creating grade mapping:", error)
    return NextResponse.json({ success: false, error: "Failed to create grade mapping" }, { status: 500 })
  }
}
