// Utility functions for exporting student data

import type { Student } from "@/lib/api/students"

// Convert students data to CSV format
export function convertToCSV(students: Student[], fields: string[]): string {
  const headers = fields.map((field) => getFieldLabel(field)).join(",")
  const rows = students.map((student) => {
    return fields
      .map((field) => {
        const value = student[field as keyof Student] || ""
        // Escape commas and quotes in CSV
        return `"${String(value).replace(/"/g, '""')}"`
      })
      .join(",")
  })

  return [headers, ...rows].join("\n")
}

// Convert students data to JSON format
export function convertToJSON(students: Student[], fields: string[]): string {
  const filteredStudents = students.map((student) => {
    const filtered: Partial<Student> = {}
    fields.forEach((field) => {
      filtered[field as keyof Student] = student[field as keyof Student]
    })
    return filtered
  })

  return JSON.stringify(filteredStudents, null, 2)
}

// Download file with given content
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Get human-readable field labels
function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    id: "ID",
    studentId: "Student ID",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    phone: "Phone",
    class: "Class",
    section: "Section",
    gender: "Gender",
    bloodType: "Blood Type",
    nationality: "Nationality",
    religion: "Religion",
    address: "Address",
    city: "City",
    zip: "ZIP Code",
    fatherName: "Father's Name",
    motherName: "Mother's Name",
    fatherPhone: "Father's Phone",
    motherPhone: "Mother's Phone",
    fatherOccupation: "Father's Occupation",
    motherOccupation: "Mother's Occupation",
    fatherEmail: "Father's Email",
    motherEmail: "Mother's Email",
    emergencyContact: "Emergency Contact",
    medicalConditions: "Medical Conditions",
    allergies: "Allergies",
    previousSchool: "Previous School",
    transferReason: "Transfer Reason",
    status: "Status",
    enrollmentDate: "Enrollment Date",
    createdAt: "Created At",
    updatedAt: "Updated At",
  }

  return labels[field] || field
}

// Generate filename with timestamp
export function generateExportFilename(format: string, prefix = "students"): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-")
  return `${prefix}_${timestamp}.${format}`
}

// Export students data in specified format
export async function exportStudentsData(students: Student[], format: string, fields: string[]): Promise<void> {
  let content: string
  let mimeType: string
  let filename: string

  switch (format.toLowerCase()) {
    case "csv":
      content = convertToCSV(students, fields)
      mimeType = "text/csv;charset=utf-8;"
      filename = generateExportFilename("csv")
      break
    case "json":
      content = convertToJSON(students, fields)
      mimeType = "application/json;charset=utf-8;"
      filename = generateExportFilename("json")
      break
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }

  downloadFile(content, filename, mimeType)
}

// Validate export parameters
export function validateExportParams(
  students: Student[],
  format: string,
  fields: string[],
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!students || students.length === 0) {
    errors.push("No students data to export")
  }

  if (!format || !["csv", "json"].includes(format.toLowerCase())) {
    errors.push("Invalid export format. Supported formats: CSV, JSON")
  }

  if (!fields || fields.length === 0) {
    errors.push("No fields selected for export")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
