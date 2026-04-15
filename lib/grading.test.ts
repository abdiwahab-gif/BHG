import { describe, expect, it } from "vitest"

import {
  calculateGradeFromPercentage,
  calculateGradePointFromPercentage,
  calculateLetterGradeFromPercentage,
  getDefaultGradeMappingsABCD,
} from "@/lib/grading"
import { GPACalculator, type CourseResult } from "@/lib/gpa-calculator"

describe("grading rules (A/B/C/D/F)", () => {
  it("maps boundaries to correct letter grades", () => {
    expect(calculateLetterGradeFromPercentage(100)).toBe("A")
    expect(calculateLetterGradeFromPercentage(90)).toBe("A")
    expect(calculateLetterGradeFromPercentage(89.999)).toBe("B")
    expect(calculateLetterGradeFromPercentage(80)).toBe("B")

    expect(calculateLetterGradeFromPercentage(79.999)).toBe("C")
    expect(calculateLetterGradeFromPercentage(65)).toBe("C")

    expect(calculateLetterGradeFromPercentage(64.999)).toBe("D")
    expect(calculateLetterGradeFromPercentage(50)).toBe("D")

    expect(calculateLetterGradeFromPercentage(49.999)).toBe("F")
    expect(calculateLetterGradeFromPercentage(0)).toBe("F")
  })

  it("maps boundaries to correct grade points", () => {
    expect(calculateGradePointFromPercentage(100)).toBe(4)
    expect(calculateGradePointFromPercentage(90)).toBe(4)
    expect(calculateGradePointFromPercentage(89.9)).toBe(3)
    expect(calculateGradePointFromPercentage(80)).toBe(3)

    expect(calculateGradePointFromPercentage(79.9)).toBe(2)
    expect(calculateGradePointFromPercentage(65)).toBe(2)

    expect(calculateGradePointFromPercentage(64.9)).toBe(1)
    expect(calculateGradePointFromPercentage(50)).toBe(1)

    expect(calculateGradePointFromPercentage(49.9)).toBe(0)
  })

  it("returns both letter and points", () => {
    expect(calculateGradeFromPercentage(92)).toEqual({ letterGrade: "A", gradePoint: 4 })
    expect(calculateGradeFromPercentage(83)).toEqual({ letterGrade: "B", gradePoint: 3 })
    expect(calculateGradeFromPercentage(70)).toEqual({ letterGrade: "C", gradePoint: 2 })
    expect(calculateGradeFromPercentage(55)).toEqual({ letterGrade: "D", gradePoint: 1 })
    expect(calculateGradeFromPercentage(10)).toEqual({ letterGrade: "F", gradePoint: 0 })
  })
})

describe("semester GPA (credit-weighted)", () => {
  it("computes GPA from course credits and grade points", () => {
    const calculator = new GPACalculator(getDefaultGradeMappingsABCD() as any)

    const courseResults: CourseResult[] = [
      {
        courseId: "c1",
        courseCode: "CS101",
        courseName: "Intro",
        credits: 3,
        examResults: [
          {
            examTypeId: "e1",
            examTypeName: "Final",
            weight: 100,
            score: 90,
            maxScore: 100,
            percentage: 90,
          },
        ],
      },
      {
        courseId: "c2",
        courseCode: "MATH101",
        courseName: "Calculus",
        credits: 4,
        examResults: [
          {
            examTypeId: "e1",
            examTypeName: "Final",
            weight: 100,
            score: 80,
            maxScore: 100,
            percentage: 80,
          },
        ],
      },
    ]

    const result = calculator.calculateGPA(courseResults)

    // (4*3 + 3*4) / (3+4) = 24/7 = 3.42857... => 3.43
    expect(result.gpa).toBe(3.43)
    expect(result.totalCredits).toBe(7)
    expect(result.totalGradePoints).toBe(24)
    expect(result.totalCreditsEarned).toBe(7)
    expect(result.courseGrades.map((g) => g.letterGrade)).toEqual(["A", "B"])
  })

  it("includes failed course credits in attempted credits", () => {
    const calculator = new GPACalculator(getDefaultGradeMappingsABCD() as any)

    const courseResults: CourseResult[] = [
      {
        courseId: "c1",
        courseCode: "BIO101",
        courseName: "Biology",
        credits: 3,
        examResults: [
          {
            examTypeId: "e1",
            examTypeName: "Final",
            weight: 100,
            score: 40,
            maxScore: 100,
            percentage: 40,
          },
        ],
      },
    ]

    const result = calculator.calculateGPA(courseResults)
    expect(result.gpa).toBe(0)
    expect(result.totalCredits).toBe(3)
    expect(result.totalGradePoints).toBe(0)
    expect(result.totalCreditsEarned).toBe(0)
    expect(result.courseGrades[0].letterGrade).toBe("F")
  })
})
