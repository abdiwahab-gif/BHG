export interface ClassSection {
  id: string
  name: string
  roomNumber: string
  capacity: number
  currentStudents: number
}

export interface ClassCourse {
  id: string
  name: string
  type: "General" | "Elective"
  credits: number
  teacherId?: string
  teacherName?: string
}

export interface Class {
  id: string
  name: string
  description: string
  academicYear: string
  sections: ClassSection[]
  courses: ClassCourse[]
  createdAt: string
  updatedAt: string
}

export interface CreateClassRequest {
  name: string
  description?: string
  academicYear: string
}

export interface UpdateClassRequest extends Partial<CreateClassRequest> {
  id: string
}
