export interface IDCard {
  id: string
  type: 'student' | 'staff'
  cardNumber: string
  personId: string
  personName: string
  department: string
  program?: string // For students
  position?: string // For staff
  photo: string
  photoUrl?: string // Alternative photo URL field
  issueDate: string
  expiryDate: string
  qrCodeData: string
  status: 'active' | 'expired' | 'suspended'
  issuedBy: string
  academicYear?: string // For students
}

export interface CreateIDCardRequest {
  type: 'student' | 'staff'
  personId: string
  department: string
  program?: string
  position?: string
  academicYear?: string
  validityPeriod?: number // in years, default 4 for students, 5 for staff
  photo?: string
}

export interface IDCardFilters {
  type?: 'student' | 'staff' | 'all'
  department?: string
  status?: 'active' | 'expired' | 'suspended' | 'all'
  search?: string
  page?: number
  limit?: number
}

export interface IDCardListResponse {
  cards: IDCard[]
  total: number
  page: number
  limit: number
}

export interface PrintRequest {
  cardIds: string[]
  printType: 'single' | 'batch'
  paperSize?: 'A4' | 'Letter'
  cardsPerPage?: number
}