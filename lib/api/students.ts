// API client functions for student operations

export interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  class: string
  section: string
  photo?: string
  status: "active" | "inactive" | "suspended"
  gender: "male" | "female" | "other"
  enrollmentDate: string
  studentId: string
  bloodType: string
  nationality: string
  religion: string
  address: string
  city: string
  zip: string
  fatherName: string
  motherName: string
  fatherPhone: string
  motherPhone: string
  fatherOccupation?: string
  motherOccupation?: string
  fatherEmail?: string
  motherEmail?: string
  emergencyContact: string
  medicalConditions?: string
  allergies?: string
  previousSchool?: string
  transferReason?: string
  createdAt?: string
  updatedAt?: string
}

export interface StudentsResponse {
  students: Student[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: {
    search?: string
    class?: string
    section?: string
    gender?: string
    status?: string
  }
}

export interface StudentFilters {
  search?: string
  class?: string
  section?: string
  gender?: string
  status?: string
  bloodType?: string
  nationality?: string
  city?: string
  page?: number
  limit?: number
}

// Get all students with optional filtering
export async function getStudents(filters: StudentFilters = {}): Promise<StudentsResponse> {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value))
    }
  })

  const response = await fetch(`/api/students?${params.toString()}`)

  if (!response.ok) {
    let message = "Failed to fetch students"
    try {
      const error = await response.json()
      message = error?.details || error?.error || message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  return response.json()
}

// Get a specific student by ID
export async function getStudent(id: string): Promise<{ student: Student }> {
  const response = await fetch(`/api/students/${id}`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Student not found")
    }
    let message = "Failed to fetch student"
    try {
      const error = await response.json()
      message = error?.details || error?.error || message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  return response.json()
}

// Create a new student
export async function createStudent(
  studentData: Omit<Student, "id" | "studentId" | "status" | "enrollmentDate" | "createdAt" | "updatedAt">,
): Promise<{ student: Student; message: string }> {
  const response = await fetch("/api/students", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(studentData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to create student")
  }

  return response.json()
}

// Update a student
export async function updateStudent(
  id: string,
  studentData: Partial<Student>,
): Promise<{ student: Student; message: string }> {
  const response = await fetch(`/api/students/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(studentData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to update student")
  }

  return response.json()
}

// Delete a student
export async function deleteStudent(id: string): Promise<{ student: Student; message: string }> {
  const response = await fetch(`/api/students/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to delete student")
  }

  return response.json()
}

// Delete multiple students
export async function deleteStudents(
  ids: string[],
): Promise<{ deletedStudents: Student[]; deletedCount: number; message: string }> {
  const response = await fetch("/api/students/bulk", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to delete students")
  }

  return response.json()
}

// Update multiple students (e.g., status changes)
export async function updateStudents(
  ids: string[],
  updates: Partial<Student>,
): Promise<{ updatedStudents: Student[]; updatedCount: number; message: string }> {
  const response = await fetch("/api/students/bulk", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids, updates }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to update students")
  }

  return response.json()
}

// Export students data (for CSV/Excel export)
export async function exportStudents(filters: StudentFilters = {}): Promise<Student[]> {
  const response = await getStudents({ ...filters, limit: 1000 }) // Get all students for export
  return response.students
}

// Generate student ID
export function generateStudentId(className: string, section: string, sequence: number): string {
  const year = new Date().getFullYear()
  const classNumber = className.replace("Class ", "")
  const sectionLetter = section.replace("Section ", "")
  const sequenceStr = String(sequence).padStart(3, "0")
  return `${year}-${classNumber}-${sectionLetter}-${sequenceStr}`
}

// Validate student data
export function validateStudentData(data: Partial<Student>): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Required fields validation
  const requiredFields = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "class",
    "section",
    "gender",
    "bloodType",
    "nationality",
    "religion",
    "address",
    "city",
    "zip",
    "fatherName",
    "motherName",
    "fatherPhone",
    "motherPhone",
    "emergencyContact",
  ]

  requiredFields.forEach((field) => {
    if (!data[field as keyof Student]) {
      errors.push(`${field} is required`)
    }
  })

  // Email validation
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Invalid email format")
  }

  // Phone validation (basic)
  if (data.phone && data.phone.length < 10) {
    errors.push("Phone number must be at least 10 characters")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
