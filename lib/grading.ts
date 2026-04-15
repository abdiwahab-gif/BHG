export type LetterGrade = "A" | "B" | "C" | "D" | "F"

export interface GradeMappingLike {
  minScore: number
  maxScore: number
  letterGrade: string
  gradePoint: number
  isPassingGrade: boolean
  description: string
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

/**
 * Academic module grading rules (fixed scale):
 * - A: 90–100 => 4
 * - B: 80–89.999... => 3
 * - C: 65–79.999... => 2
 * - D: 50–64.999... => 1
 * - F: <50 => 0
 */
export function calculateGradePointFromPercentage(percentage: number): number {
  const p = clampPercentage(percentage)
  if (p >= 90) return 4
  if (p >= 80) return 3
  if (p >= 65) return 2
  if (p >= 50) return 1
  return 0
}

export function calculateLetterGradeFromPercentage(percentage: number): LetterGrade {
  const p = clampPercentage(percentage)
  if (p >= 90) return "A"
  if (p >= 80) return "B"
  if (p >= 65) return "C"
  if (p >= 50) return "D"
  return "F"
}

export function calculateGradeFromPercentage(percentage: number): { letterGrade: LetterGrade; gradePoint: number } {
  return {
    letterGrade: calculateLetterGradeFromPercentage(percentage),
    gradePoint: calculateGradePointFromPercentage(percentage),
  }
}

export function getDefaultGradeMappingsABCD(): GradeMappingLike[] {
  // Use half-open intervals via decimal maxScore so callers using `<= maxScore` behave correctly for decimals.
  return [
    {
      minScore: 90,
      maxScore: 100,
      letterGrade: "A",
      gradePoint: 4,
      isPassingGrade: true,
      description: "Excellent",
    },
    {
      minScore: 80,
      maxScore: 89.9999,
      letterGrade: "B",
      gradePoint: 3,
      isPassingGrade: true,
      description: "Very Good",
    },
    {
      minScore: 65,
      maxScore: 79.9999,
      letterGrade: "C",
      gradePoint: 2,
      isPassingGrade: true,
      description: "Good",
    },
    {
      minScore: 50,
      maxScore: 64.9999,
      letterGrade: "D",
      gradePoint: 1,
      isPassingGrade: true,
      description: "Pass",
    },
    {
      minScore: 0,
      maxScore: 49.9999,
      letterGrade: "F",
      gradePoint: 0,
      isPassingGrade: false,
      description: "Fail",
    },
  ]
}
