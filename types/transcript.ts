export type TranscriptTermName = "Spring Semester" | "Fall Semester"

export type TranscriptCourse = {
  code: string
  title: string
  creditHours: number
  grade: string
  honorPoints: number
}

export type TranscriptTerm = {
  academicYear: string
  term: TranscriptTermName
  creditHoursCurrent: number
  creditHoursCumulative: number
  gpaCurrent: number
  gpaCumulative: number
  courses: TranscriptCourse[]
}

export type TranscriptStudent = {
  studentName: string
  studentId: string
  faculty: string
  department: string
  dateOfInitialEntry: string
  degreeGranted: string
  dateGranted: string
  cgpa: string
}

export type TranscriptData = {
  universityName: string
  subtitle: string
  student: TranscriptStudent
  terms: TranscriptTerm[]
  serialNumber: string
  dateOfIssue: string
  security?: TranscriptSecurity
}

export type TranscriptSecurity = {
  qrPayload: string
  qrDataUrl: string
  verificationUrl: string
}
