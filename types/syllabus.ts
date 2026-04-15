export interface Syllabus {
  id: string
  name: string
  faculty: string
  classId: string
  className: string
  courseId: string
  courseName: string
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
  uploadedBy: string
  uploadedAt: string
  updatedAt: string
}

export interface CreateSyllabusRequest {
  name: string
  faculty: string
  classId: string
  courseId: string
  file: File
}

export interface UpdateSyllabusRequest extends Partial<Omit<CreateSyllabusRequest, 'file'>> {
  id: string
  file?: File
}

export interface SyllabusListResponse {
  syllabi: Syllabus[]
  total: number
  page: number
  limit: number
}

export interface SyllabusFilters {
  faculty?: string
  classId?: string
  courseId?: string
  search?: string
  page?: number
  limit?: number
}