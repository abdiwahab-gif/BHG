export interface CourseResult {
  courseId: string
  courseCode: string
  courseName: string
  credits: number
  examResults: ExamResult[]
  attendancePercentage?: number
}

export interface ExamResult {
  examTypeId: string
  examTypeName: string
  weight: number
  score: number
  maxScore: number
  percentage: number
}

export interface GradeMapping {
  minScore: number
  maxScore: number
  letterGrade: string
  gradePoint: number
  isPassingGrade: boolean
  description: string
}

export interface GPAResult {
  gpa: number
  cgpa?: number
  totalCredits: number
  totalCreditsEarned?: number
  totalGradePoints: number
  courseGrades: CourseGrade[]
  calculatedAt: Date
}

export interface CourseGrade {
  courseId: string
  courseCode: string
  courseName: string
  credits: number
  finalScore: number
  letterGrade: string
  gradePoint: number
  isPassingGrade: boolean
  attendancePercentage?: number
}

export class GPACalculator {
  private gradeMappings: GradeMapping[]
  private includeAttendance: boolean
  private attendanceThreshold: number

  constructor(gradeMappings: GradeMapping[], includeAttendance = false, attendanceThreshold = 75) {
    this.gradeMappings = gradeMappings.sort((a, b) => b.minScore - a.minScore)
    this.includeAttendance = includeAttendance
    this.attendanceThreshold = attendanceThreshold
  }

  calculateGPA(courseResults: CourseResult[]): GPAResult {
    const courseGrades: CourseGrade[] = []
    let totalGradePoints = 0
    let totalCredits = 0
    let totalCreditsEarned = 0

    for (const courseResult of courseResults) {
      const courseGrade = this.calculateCourseGrade(courseResult)
      courseGrades.push(courseGrade)

      if (Number.isFinite(courseGrade.credits) && courseGrade.credits > 0) {
        // Best practice: GPA uses attempted credits; failed courses contribute 0 grade points but still count in credits.
        totalGradePoints += courseGrade.gradePoint * courseGrade.credits
        totalCredits += courseGrade.credits

        if (courseGrade.isPassingGrade) {
          totalCreditsEarned += courseGrade.credits
        }
      }
    }

    const gpa = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0

    return {
      gpa,
      totalCredits,
      totalCreditsEarned,
      totalGradePoints,
      courseGrades,
      calculatedAt: new Date(),
    }
  }

  private calculateCourseGrade(courseResult: CourseResult): CourseGrade {
    // Calculate weighted average of exam results
    let finalScore = this.calculateWeightedAverage(courseResult.examResults)

    // Apply attendance penalty if required
    if (this.includeAttendance && courseResult.attendancePercentage !== undefined) {
      finalScore = this.applyAttendancePenalty(finalScore, courseResult.attendancePercentage)
    }

    // Find appropriate grade mapping
    const gradeMapping = this.findGradeMapping(finalScore)

    return {
      courseId: courseResult.courseId,
      courseCode: courseResult.courseCode,
      courseName: courseResult.courseName,
      credits: courseResult.credits,
      finalScore,
      letterGrade: gradeMapping.letterGrade,
      gradePoint: gradeMapping.gradePoint,
      isPassingGrade: gradeMapping.isPassingGrade,
      attendancePercentage: courseResult.attendancePercentage,
    }
  }

  private calculateWeightedAverage(examResults: ExamResult[]): number {
    if (examResults.length === 0) return 0

    let weightedSum = 0
    let totalWeight = 0

    for (const result of examResults) {
      weightedSum += result.percentage * (result.weight / 100)
      totalWeight += result.weight
    }

    // Normalize if total weight is not 100%
    return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0
  }

  private applyAttendancePenalty(score: number, attendancePercentage: number): number {
    if (attendancePercentage >= this.attendanceThreshold) {
      return score
    }

    // Apply penalty: 0.5 points per percentage below threshold
    const penalty = (this.attendanceThreshold - attendancePercentage) * 0.5
    return Math.max(0, score - penalty)
  }

  private findGradeMapping(score: number): GradeMapping {
    for (const mapping of this.gradeMappings) {
      if (score >= mapping.minScore && score <= mapping.maxScore) {
        return mapping
      }
    }

    // Default to fail grade
    return {
      minScore: 0,
      maxScore: 49,
      letterGrade: "F",
      gradePoint: 0.0,
      isPassingGrade: false,
      description: "Fail",
    }
  }

  // Static utility methods
  static calculateCGPA(semesterGPAs: Array<{ gpa: number; credits: number }>): number {
    let totalGradePoints = 0
    let totalCredits = 0

    for (const semester of semesterGPAs) {
      totalGradePoints += semester.gpa * semester.credits
      totalCredits += semester.credits
    }

    return totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0
  }

  static getGradeStatus(gpa: number): {
    status: "excellent" | "good" | "satisfactory" | "probation" | "fail"
    description: string
    color: string
  } {
    if (gpa >= 3.5) {
      return { status: "excellent", description: "Excellent Performance", color: "green" }
    } else if (gpa >= 3.0) {
      return { status: "good", description: "Good Performance", color: "blue" }
    } else if (gpa >= 2.0) {
      return { status: "satisfactory", description: "Satisfactory Performance", color: "yellow" }
    } else if (gpa >= 1.0) {
      return { status: "probation", description: "Academic Probation", color: "orange" }
    } else {
      return { status: "fail", description: "Academic Failure", color: "red" }
    }
  }
}

// Utility functions for different grading systems
export const GradingSystemUtils = {
  // Convert between different grading systems
  convertGrade(
    score: number,
    fromSystem: "percentage" | "gpa_4" | "gpa_5",
    toSystem: "percentage" | "gpa_4" | "gpa_5",
  ): number {
    if (fromSystem === toSystem) return score

    // Convert to percentage first
    let percentage: number
    switch (fromSystem) {
      case "percentage":
        percentage = score
        break
      case "gpa_4":
        percentage = (score / 4.0) * 100
        break
      case "gpa_5":
        percentage = (score / 5.0) * 100
        break
    }

    // Convert from percentage to target system
    switch (toSystem) {
      case "percentage":
        return percentage
      case "gpa_4":
        return (percentage / 100) * 4.0
      case "gpa_5":
        return (percentage / 100) * 5.0
    }
  },

  // Validate grade mappings for consistency
  validateGradeMappings(mappings: GradeMapping[]): string[] {
    const errors: string[] = []
    const sortedMappings = mappings.sort((a, b) => a.minScore - b.minScore)

    // Check for gaps and overlaps
    for (let i = 0; i < sortedMappings.length - 1; i++) {
      const current = sortedMappings[i]
      const next = sortedMappings[i + 1]

      if (current.maxScore + 1 !== next.minScore) {
        if (current.maxScore >= next.minScore) {
          errors.push(`Overlap between grades: ${current.letterGrade} and ${next.letterGrade}`)
        } else {
          errors.push(`Gap between grades: ${current.letterGrade} and ${next.letterGrade}`)
        }
      }
    }

    // Check for complete coverage (0-100)
    if (sortedMappings.length > 0) {
      if (sortedMappings[0].minScore > 0) {
        errors.push("Grade mappings do not cover scores from 0")
      }
      if (sortedMappings[sortedMappings.length - 1].maxScore < 100) {
        errors.push("Grade mappings do not cover scores up to 100")
      }
    }

    return errors
  },
}
