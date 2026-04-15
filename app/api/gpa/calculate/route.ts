import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getDefaultGradeMappingsABCD } from "@/lib/grading"

const gpaCalculationSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  sessionId: z.string().min(1, "Session ID is required"),
  semesterId: z.string().optional(),
  includeAttendance: z.boolean().default(false),
  gradingSystemId: z.string().optional(),
})

// Mock data
const examResults: any[] = []
const courses: any[] = [
  { id: "1", code: "CS101", name: "Introduction to Computer Science", credits: 3 },
  { id: "2", code: "MATH101", name: "Calculus I", credits: 4 },
  { id: "3", code: "ENG101", name: "English Composition", credits: 3 },
]

const attendanceRecords: any[] = []

const gradeMappings: any[] = getDefaultGradeMappingsABCD().map((m, idx) => ({
  id: String(idx + 1),
  gradingSystemId: "1",
  ...m,
}))

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = gpaCalculationSchema.parse(body)

    const { studentId, sessionId, semesterId, includeAttendance, gradingSystemId = "1" } = validatedData

    // Get grade mappings for the specified grading system
    const systemMappings = gradeMappings
      .filter((mapping) => mapping.gradingSystemId === gradingSystemId)
      .sort((a, b) => b.minScore - a.minScore)

    // Filter exam results
    let filteredResults = examResults.filter(
      (result) => result.studentId === studentId && result.sessionId === sessionId && result.isPublished === true,
    )

    if (semesterId) {
      filteredResults = filteredResults.filter((result) => result.semesterId === semesterId)
    }

    // Group results by course
    const courseResults = new Map<string, any[]>()
    filteredResults.forEach((result) => {
      if (!courseResults.has(result.courseId)) {
        courseResults.set(result.courseId, [])
      }
      courseResults.get(result.courseId)!.push(result)
    })

    // Calculate final grades for each course
    const courseGrades: any[] = []
    let totalGradePoints = 0
    let totalCredits = 0
    let totalCreditsEarned = 0

    for (const [courseId, results] of courseResults) {
      const course = courses.find((c) => c.id === courseId)
      if (!course) continue

      // Calculate weighted average for the course
      const finalScore = calculateCourseWeightedAverage(results)

      // Apply attendance penalty if required
      let adjustedScore = finalScore
      if (includeAttendance) {
        const attendance = attendanceRecords.find(
          (record) =>
            record.studentId === studentId &&
            record.courseId === courseId &&
            record.sessionId === sessionId &&
            (!semesterId || record.semesterId === semesterId),
        )

        if (attendance && attendance.attendancePercentage < 75) {
          // Apply penalty for low attendance
          const penalty = Math.max(0, (75 - attendance.attendancePercentage) * 0.5)
          adjustedScore = Math.max(0, finalScore - penalty)
        }
      }

      // Find grade mapping
      const gradeMapping = findGradeMapping(adjustedScore, systemMappings)

      courseGrades.push({
        courseId,
        courseCode: course.code,
        courseName: course.name,
        credits: course.credits,
        finalScore: adjustedScore,
        letterGrade: gradeMapping.letterGrade,
        gradePoint: gradeMapping.gradePoint,
        isPassingGrade: gradeMapping.isPassingGrade,
      })

      // Best practice: semester GPA is credit-weighted over attempted credits.
      if (Number.isFinite(course.credits) && course.credits > 0) {
        totalGradePoints += gradeMapping.gradePoint * course.credits
        totalCredits += course.credits
        if (gradeMapping.isPassingGrade) totalCreditsEarned += course.credits
      }
    }

    // Calculate GPA
    const gpa = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0

    // Calculate CGPA if this is a semester GPA
    let cgpa = null
    if (semesterId) {
      // This would typically involve fetching all previous semesters
      // For now, we'll just return the current GPA as CGPA
      cgpa = gpa
    }

    const result = {
      studentId,
      sessionId,
      semesterId,
      gpa,
      cgpa,
      totalCredits,
      totalCreditsEarned,
      totalGradePoints,
      courseGrades,
      calculatedAt: new Date(),
      gradingSystemId,
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Validation failed", details: error.errors }, { status: 400 })
    }

    console.error("Error calculating GPA:", error)
    return NextResponse.json({ success: false, error: "Failed to calculate GPA" }, { status: 500 })
  }
}

function calculateCourseWeightedAverage(results: any[]): number {
  // Group by exam type and calculate weighted average
  const examTypeScores = new Map<string, { score: number; weight: number }>()

  results.forEach((result) => {
    const examType = getExamTypeById(result.examTypeId)
    if (examType) {
      examTypeScores.set(result.examTypeId, {
        score: result.percentage,
        weight: examType.weight,
      })
    }
  })

  let weightedSum = 0
  let totalWeight = 0

  for (const { score, weight } of examTypeScores.values()) {
    weightedSum += score * (weight / 100)
    totalWeight += weight
  }

  // Normalize if total weight is not 100%
  return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0
}

function findGradeMapping(score: number, mappings: any[]) {
  for (const mapping of mappings) {
    if (score >= mapping.minScore && score <= mapping.maxScore) {
      return mapping
    }
  }

  // Default to fail grade if no mapping found
  return {
    letterGrade: "F",
    gradePoint: 0.0,
    description: "Fail",
    isPassingGrade: false,
  }
}

function getExamTypeById(id: string) {
  const examTypes = [
    { id: "1", name: "Midterm Exam", code: "MID", weight: 30 },
    { id: "2", name: "Final Exam", code: "FINAL", weight: 50 },
    { id: "3", name: "Assignment", code: "ASSIGNMENT", weight: 10 },
    { id: "4", name: "Attendance", code: "ATTENDANCE", weight: 10 },
  ]

  return examTypes.find((type) => type.id === id)
}
