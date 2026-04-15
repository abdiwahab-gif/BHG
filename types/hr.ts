// Core Employee Types
export interface Employee {
  id: string
  employeeId: string
  biometricUserId?: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  personalEmail?: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed'
  nationality: string
  address: Address
  emergencyContact: EmergencyContact
  
  // Employment Details
  position: string
  department: string
  division?: string
  manager?: string
  managerId?: string
  employeeType: 'full-time' | 'part-time' | 'contract' | 'intern'
  employmentStatus: 'active' | 'inactive' | 'terminated' | 'on-leave' | 'probation'
  hireDate: string
  terminationDate?: string
  probationEndDate?: string
  
  // Compensation
  salary: number
  salaryType: 'hourly' | 'monthly' | 'annual'
  currency: string
  payGrade: string
  benefits: string[]
  
  // Work Details
  workLocation: string
  workSchedule: WorkSchedule
  timezone: string
  
  // Documents & Compliance
  taxId?: string
  socialSecurityNumber?: string
  passportNumber?: string
  visaStatus?: string
  workPermitExpiry?: string
  
  // System Fields
  createdAt: string
  updatedAt: string
  createdBy: string
  isActive: boolean
  profilePicture?: string
  
  // Skills & Qualifications
  skills: Skill[]
  education: Education[]
  certifications: Certification[]
  languages: Language[]
}

export interface Address {
  street: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  email?: string
  address?: Address
}

export interface WorkSchedule {
  type: 'standard' | 'flexible' | 'shift' | 'remote'
  hoursPerWeek: number
  workDays: string[]
  startTime: string
  endTime: string
  breakDuration: number
}

export interface Skill {
  name: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  verified: boolean
  addedDate: string
}

export interface Education {
  id: string
  institution: string
  degree: string
  fieldOfStudy: string
  startDate: string
  endDate?: string
  grade?: string
  description?: string
}

export interface Certification {
  id: string
  name: string
  issuingOrganization: string
  issueDate: string
  expiryDate?: string
  credentialId?: string
  credentialUrl?: string
}

export interface Language {
  language: string
  proficiency: 'basic' | 'conversational' | 'fluent' | 'native'
}

// Attendance Types
export interface Attendance {
  id: string
  employeeId: string
  employee?: Employee
  date: string
  clockIn?: string
  clockOut?: string
  breakStart?: string
  breakEnd?: string
  hoursWorked: number
  overtimeHours: number
  status: 'present' | 'absent' | 'late' | 'half-day' | 'holiday' | 'weekend'
  location: string
  notes?: string
  approvedBy?: string
  isManualEntry: boolean
  createdAt: string
}

export interface AttendanceRule {
  id: string
  name: string
  description: string
  tardyGracePeriod: number // minutes
  minimumWorkHours: number
  overtimeThreshold: number
  autoClockOut: boolean
  autoClockOutTime: string
  requiredBreakTime: number
  maxBreakTime: number
  isActive: boolean
}

// Leave Management Types
export interface LeaveRequest {
  id: string
  employeeId: string
  employee?: Employee
  leaveType: LeaveType
  startDate: string
  endDate: string
  totalDays: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  appliedDate: string
  reviewedDate?: string
  reviewedBy?: string
  reviewerComments?: string
  documents?: string[]
  isEmergency: boolean
}

export interface LeaveType {
  id: string
  name: string
  description: string
  maxDaysPerYear: number
  carryForward: boolean
  maxCarryForwardDays: number
  requiresApproval: boolean
  approverLevels: number
  isPaid: boolean
  minimumNotice: number // days
  isActive: boolean
  color: string
}

export interface LeaveBalance {
  id: string
  employeeId: string
  leaveTypeId: string
  leaveType?: LeaveType
  year: number
  allocated: number
  used: number
  pending: number
  remaining: number
  carriedForward: number
  lastUpdated: string
}

// Payroll Types
export interface PayrollRecord {
  id: string
  employeeId: string
  employee?: Employee
  payPeriodStart: string
  payPeriodEnd: string
  payDate: string
  baseSalary: number
  overtimePay: number
  bonuses: PayrollComponent[]
  deductions: PayrollComponent[]
  benefits: PayrollComponent[]
  grossPay: number
  netPay: number
  taxes: TaxDeduction[]
  status: 'draft' | 'pending' | 'approved' | 'paid'
  payslipGenerated: boolean
  createdAt: string
  approvedBy?: string
  paidBy?: string
}

export interface PayrollComponent {
  type: string
  description: string
  amount: number
  isRecurring: boolean
  taxable: boolean
}

export interface TaxDeduction {
  type: string
  description: string
  rate: number
  amount: number
  category: 'federal' | 'state' | 'local' | 'other'
}

// Performance Management Types
export interface PerformanceReview {
  id: string
  employeeId: string
  employee?: Employee
  reviewerId: string
  reviewer?: Employee
  reviewType: 'annual' | 'quarterly' | 'probation' | 'project' | '360'
  reviewPeriodStart: string
  reviewPeriodEnd: string
  status: 'not-started' | 'in-progress' | 'completed' | 'approved'
  overallRating: number
  goals: Goal[]
  competencies: CompetencyRating[]
  achievements: string[]
  areasForImprovement: string[]
  developmentPlan: string[]
  reviewerComments: string
  employeeComments?: string
  hrComments?: string
  createdDate: string
  completedDate?: string
  dueDate: string
}

export interface Goal {
  id: string
  title: string
  description: string
  category: string
  targetDate: string
  status: 'not-started' | 'in-progress' | 'completed' | 'cancelled'
  progress: number
  rating?: number
  comments?: string
}

export interface CompetencyRating {
  competency: string
  description: string
  rating: number
  maxRating: number
  comments?: string
}

// Recruitment Types
export interface JobPosting {
  id: string
  title: string
  department: string
  location: string
  employmentType: 'full-time' | 'part-time' | 'contract' | 'intern'
  description: string
  requirements: string[]
  responsibilities: string[]
  salaryRange: {
    min: number
    max: number
    currency: string
  }
  benefits: string[]
  status: 'draft' | 'active' | 'paused' | 'closed'
  postedDate: string
  closingDate?: string
  hiringManager: string
  createdBy: string
  applicationsCount: number
}

export interface JobApplication {
  id: string
  jobId: string
  job?: JobPosting
  candidateName: string
  email: string
  phone: string
  resume: string
  coverLetter?: string
  status: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
  appliedDate: string
  source: string
  notes?: string
  interviewScheduled?: string
  rejectionReason?: string
  offerAmount?: number
}

// Training & Development Types
export interface TrainingProgram {
  id: string
  title: string
  description: string
  type: 'mandatory' | 'optional' | 'certification'
  category: string
  duration: number // hours
  format: 'online' | 'in-person' | 'hybrid'
  instructor?: string
  maxParticipants?: number
  cost: number
  startDate: string
  endDate: string
  status: 'planned' | 'active' | 'completed' | 'cancelled'
  materials: string[]
  prerequisites: string[]
}

export interface TrainingEnrollment {
  id: string
  programId: string
  program?: TrainingProgram
  employeeId: string
  employee?: Employee
  enrollmentDate: string
  status: 'enrolled' | 'in-progress' | 'completed' | 'dropped'
  completionDate?: string
  score?: number
  certificate?: string
  feedback?: string
}

// HR Analytics & Reports Types
export interface HRMetrics {
  totalEmployees: number
  activeEmployees: number
  newHires: number
  terminations: number
  turnoverRate: number
  averageAge: number
  averageTenure: number
  genderDistribution: {
    male: number
    female: number
    other: number
  }
  departmentDistribution: DepartmentMetrics[]
  attendanceRate: number
  absenteeismRate: number
  averageRating: number
  trainingHours: number
  recruitmentMetrics: RecruitmentMetrics
}

export interface DepartmentMetrics {
  department: string
  employeeCount: number
  avgSalary: number
  turnoverRate: number
  attendanceRate: number
}

export interface RecruitmentMetrics {
  openPositions: number
  totalApplications: number
  avgTimeToHire: number
  avgCostPerHire: number
  sourceEffectiveness: {
    source: string
    applications: number
    hires: number
    conversionRate: number
  }[]
}

// Filter and Search Types
export interface EmployeeFilters {
  department?: string
  position?: string
  employmentStatus?: string
  employeeType?: string
  manager?: string
  location?: string
  hireDate?: {
    from: string
    to: string
  }
  salary?: {
    min: number
    max: number
  }
}

export interface AttendanceFilters {
  employeeId?: string
  department?: string
  dateRange?: {
    from: string
    to: string
  }
  status?: string
}

export interface LeaveFilters {
  employeeId?: string
  department?: string
  leaveType?: string
  status?: string
  dateRange?: {
    from: string
    to: string
  }
}

// API Response Types
export interface EmployeesResponse {
  employees: Employee[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AttendanceResponse {
  attendance: Attendance[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface LeaveResponse {
  leaves: LeaveRequest[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PayrollResponse {
  payrolls: PayrollRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Form Types
export interface CreateEmployeeRequest {
  firstName: string
  lastName: string
  email: string
  biometricUserId?: string
  phone: string
  personalEmail?: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed'
  nationality: string
  address: Address
  emergencyContact: EmergencyContact
  position: string
  department: string
  managerId?: string
  employeeType: 'full-time' | 'part-time' | 'contract' | 'intern'
  hireDate: string
  salary: number
  salaryType: 'hourly' | 'monthly' | 'annual'
  workLocation: string
  workSchedule: WorkSchedule
}

export interface UpdateEmployeeRequest extends Partial<CreateEmployeeRequest> {
  id: string
}

export interface CreateLeaveRequest {
  employeeId: string
  leaveTypeId: string
  startDate: string
  endDate: string
  reason: string
  isEmergency?: boolean
  documents?: string[]
}

export interface CreateAttendanceRequest {
  employeeId: string
  date: string
  clockIn: string
  clockOut?: string
  breakStart?: string
  breakEnd?: string
  location: string
  notes?: string
}

export interface CreatePayrollRequest {
  employeeId: string
  payPeriodStart: string
  payPeriodEnd: string
  baseSalary: number
  bonuses?: PayrollComponent[]
  deductions?: PayrollComponent[]
  benefits?: PayrollComponent[]
}