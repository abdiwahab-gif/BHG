export interface ExamType {
  id: string
  name: string
  code: string
  weight: number // Percentage weight in final grade
  description?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface GradingSystem {
  id: string
  name: string
  type: "letter" | "percentage" | "gpa_4" | "gpa_5"
  isDefault: boolean
  departmentId?: string
  programId?: string
  createdAt: Date
  updatedAt: Date
}

export interface GradeMapping {
  id: string
  gradingSystemId: string
  minScore: number
  maxScore: number
  letterGrade?: string
  gradePoint: number
  description: string
  isPassingGrade: boolean
}

export interface ExamResult {
  id: string
  studentId: string
  courseId: string
  examTypeId: string
  sessionId: string
  semesterId: string
  score: number
  maxScore: number
  percentage: number
  letterGrade?: string
  gradePoint: number
  isPublished: boolean
  publishedAt?: Date
  enteredBy: string
  enteredAt: Date
  modifiedBy?: string
  modifiedAt?: Date
  comments?: string
}

export interface StudentGPA {
  id: string
  studentId: string
  sessionId: string
  semesterId?: string // null for CGPA
  gpa: number
  totalCredits: number
  totalGradePoints: number
  calculatedAt: Date
  isActive: boolean
}

export interface AttendanceRecord {
  id: string
  studentId: string
  courseId: string
  sessionId: string
  semesterId: string
  totalClasses: number
  attendedClasses: number
  attendancePercentage: number
  lastUpdated: Date
}

export interface AuditLog {
  id: string
  userId: string
  userRole: string
  action: "CREATE" | "UPDATE" | "DELETE" | "PUBLISH" | "UNPUBLISH"
  entityType: "EXAM_RESULT" | "GRADE_MAPPING" | "EXAM_TYPE" | "GRADING_SYSTEM"
  entityId: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: Date
  reason?: string
}

export interface ExamResultsFilter {
  studentId?: string
  courseId?: string
  examTypeId?: string
  sessionId?: string
  semesterId?: string
  isPublished?: boolean
  dateFrom?: Date
  dateTo?: Date
}

export interface GPACalculationRequest {
  studentId: string
  sessionId: string
  semesterId?: string
  includeAttendance?: boolean
}

export interface TranscriptData {
  student: {
    id: string
    name: string
    studentNumber: string
    program: string
    department: string
  }
  session: string
  semester?: string
  courses: Array<{
    courseCode: string
    courseName: string
    credits: number
    examResults: ExamResult[]
    finalGrade: string
    gradePoint: number
    attendance?: number
  }>
  gpa: number
  cgpa?: number
  totalCredits: number
  generatedAt: Date
  generatedBy: string
}
