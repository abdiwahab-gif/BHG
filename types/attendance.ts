export interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  courseId: string
  courseName: string
  classId: string
  className: string
  status: "present" | "absent" | "late"
  date: string
  takenBy: string
  takenAt: string
  notes?: string
}

export interface StudentAttendance {
  id?: string
  studentId: string
  name?: string
  studentName: string
  rollNumber?: string
  status: "present" | "absent" | "late"
  notes?: string
}

export interface AttendanceSession {
  id: string
  courseId: string
  courseName: string
  classId: string
  className: string
  date: string
  totalStudents: number
  presentCount: number
  absentCount: number
  lateCount: number
  takenBy: string
  takenAt: string
  createdAt?: string
  notes?: string
  students: StudentAttendance[]
}

export interface CreateAttendanceRequest {
  courseId: string
  classId: string
  date: string
  students: StudentAttendance[]
  notes?: string
}

export interface AttendanceFilters {
  courseId?: string
  classId?: string
  startDate?: string
  endDate?: string
  studentId?: string
  page?: number
  limit?: number
}

export interface AttendanceStats {
  totalSessions: number
  totalPresent: number
  totalAbsent: number
  totalLate: number
  attendanceRate: number
}

export interface StudentAttendanceReport {
  studentId: string
  studentName: string
  totalSessions: number
  presentCount: number
  absentCount: number
  lateCount: number
  attendanceRate: number
  recentAttendance: AttendanceRecord[]
}