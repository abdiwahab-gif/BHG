import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { AuditLogger } from "@/lib/audit-logger"

const transcriptRequestSchema = z.object({
  sessionId: z.string().optional(),
  semesterId: z.string().optional(),
  format: z.enum(["pdf", "json"]).default("pdf"),
  includeGrades: z.boolean().default(true),
  includeAttendance: z.boolean().default(false),
  officialSeal: z.boolean().default(false),
})

// Mock transcript data
// const mockTranscriptData = {
//   student: {
//     id: "student-123",
//     name: "John Smith",
//     studentNumber: "2024001",
//     program: "Bachelor of Computer Science",
//     department: "Computer Science",
//     admissionDate: "2022-09-01",
//     expectedGraduation: "2026-06-30",
//     email: "john.smith@university.edu",
//   },
//   institution: {
//     name: "University of Excellence",
//     address: "123 University Ave, Academic City, AC 12345",
//     phone: "+1 (555) 123-4567",
//     website: "www.university.edu",
//     registrar: "Dr. Jane Doe",
//   },
//   academic: {
//     session: "2024-2025",
//     semester: "Fall 2024",
//     currentGPA: 3.45,
//     cumulativeGPA: 3.38,
//     totalCreditsEarned: 90,
//     totalCreditsRequired: 120,
//     academicStanding: "Good Standing",
//   },
//   courses: [
//     {
//       semester: "Fall 2022",
//       courses: [
//         {
//           courseCode: "CS101",
//           courseName: "Introduction to Computer Science",
//           credits: 3,
//           grade: "A-",
//           gradePoint: 3.7,
//           qualityPoints: 11.1,
//           attendance: 95,
//         },
//         {
//           courseCode: "MATH101",
//           courseName: "Calculus I",
//           credits: 4,
//           grade: "B+",
//           gradePoint: 3.3,
//           qualityPoints: 13.2,
//           attendance: 92,
//         },
//         {
//           courseCode: "ENG101",
//           courseName: "English Composition",
//           credits: 3,
//           grade: "A",
//           gradePoint: 4.0,
//           qualityPoints: 12.0,
//           attendance: 98,
//         },
//       ],
//       semesterGPA: 3.5,
//       semesterCredits: 10,
//     },
//     {
//       semester: "Spring 2023",
//       courses: [
//         {
//           courseCode: "CS201",
//           courseName: "Data Structures",
//           credits: 3,
//           grade: "A",
//           gradePoint: 4.0,
//           qualityPoints: 12.0,
//           attendance: 96,
//         },
//         {
//           courseCode: "MATH201",
//           courseName: "Calculus II",
//           credits: 4,
//           grade: "B",
//           gradePoint: 3.0,
//           qualityPoints: 12.0,
//           attendance: 88,
//         },
//         {
//           courseCode: "PHYS101",
//           courseName: "Physics I",
//           credits: 3,
//           grade: "B+",
//           gradePoint: 3.3,
//           qualityPoints: 9.9,
//           attendance: 90,
//         },
//       ],
//       semesterGPA: 3.4,
//       semesterCredits: 10,
//     },
//   ],
//   honors: [
//     {
//       semester: "Fall 2022",
//       honor: "Dean's List",
//       requirement: "GPA >= 3.5",
//     },
//   ],
//   generatedAt: new Date(),
//   generatedBy: "System",
//   isOfficial: false,
// }

export async function GET(request: NextRequest, { params }: { params: { studentId: string } }) {
  try {
    const { studentId } = params
    const { searchParams } = new URL(request.url)
    const options = transcriptRequestSchema.parse(Object.fromEntries(searchParams))

    // Get user from headers
    const userId = request.headers.get("x-user-id")
    const userRole = request.headers.get("x-user-role")
    const userName = request.headers.get("x-user-name")

    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Check permissions (students can only access their own transcripts)
    if (userRole === "student" && userId !== studentId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Generate transcript data from backend API
    let transcriptData
    try {
      const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/students/${studentId}/transcript`)
      if (!backendResponse.ok) {
        return NextResponse.json({ error: "Failed to fetch transcript data" }, { status: backendResponse.status })
      }
      const studentData = await backendResponse.json()
      transcriptData = {
        student: studentData.student || { id: studentId, name: 'Unknown Student', studentNumber: '' },
        institution: {
          name: "Academic Institution",
          address: "123 Academic Ave",
          phone: "+1 (555) 000-0000",
          website: "www.institution.edu",
          registrar: "Registrar Office",
        },
        academic: studentData.academic || { currentGPA: 0, cumulativeGPA: 0, totalCreditsEarned: 0, totalCreditsRequired: 0 },
        courses: studentData.courses || [],
        isOfficial: options.officialSeal && ["admin", "department_head"].includes(userRole || ""),
        generatedBy: userName || "System",
        options,
      }
    } catch (error) {
      console.error("Error fetching transcript from backend:", error)
      // Fallback to basic structure if backend is unavailable
      transcriptData = {
        student: { id: studentId, name: 'Student', studentNumber: '' },
        institution: {
          name: "Academic Institution",
          address: "123 Academic Ave",
          phone: "+1 (555) 000-0000",
          website: "www.institution.edu",
          registrar: "Registrar Office",
        },
        academic: { currentGPA: 0, cumulativeGPA: 0, totalCreditsEarned: 0, totalCreditsRequired: 0 },
        courses: [],
        isOfficial: options.officialSeal && ["admin", "department_head"].includes(userRole || ""),
        generatedBy: userName || "System",
        options,
      }
    }

    // Log transcript generation
    await AuditLogger.logTranscriptGeneration(
      { id: userId, role: userRole, name: userName },
      studentId,
      transcriptData,
      request,
    )

    if (options.format === "pdf") {
      // Generate PDF transcript
      const pdfBuffer = await generateTranscriptPDF(transcriptData)

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="transcript-${studentId}-${Date.now()}.pdf"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: transcriptData,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid parameters", details: error.errors }, { status: 400 })
    }

    console.error("Error generating transcript:", error)
    return NextResponse.json({ success: false, error: "Failed to generate transcript" }, { status: 500 })
  }
}

async function generateTranscriptPDF(transcriptData: any): Promise<Buffer> {
  // In a real implementation, this would use a PDF library like puppeteer, jsPDF, or PDFKit
  // For now, we'll return a mock PDF buffer

  const pdfContent = `
    OFFICIAL TRANSCRIPT
    ${transcriptData.institution.name}
    
    Student: ${transcriptData.student.name}
    Student ID: ${transcriptData.student.studentNumber}
    Program: ${transcriptData.student.program}
    
    Current GPA: ${transcriptData.academic.currentGPA}
    Cumulative GPA: ${transcriptData.academic.cumulativeGPA}
    
    Course History:
    ${transcriptData.courses
      .map(
        (semester: any) =>
          `${semester.semester} (GPA: ${semester.semesterGPA})\n` +
          semester.courses
            .map((course: any) => `${course.courseCode} ${course.courseName} ${course.credits} ${course.grade}`)
            .join("\n"),
      )
      .join("\n\n")}
    
    Generated: ${transcriptData.generatedAt}
    ${transcriptData.isOfficial ? "OFFICIAL SEAL" : "UNOFFICIAL COPY"}
  `

  // Convert to buffer (in real implementation, this would be actual PDF generation)
  return Buffer.from(pdfContent, "utf-8")
}
