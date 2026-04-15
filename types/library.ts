export interface Book {
  id: string
  isbn: string
  title: string
  author: string
  publisher: string
  publishedYear: number
  category: string
  subcategory?: string
  description?: string
  edition?: string
  pages?: number
  language: string
  location: string // Shelf/rack location
  totalCopies: number
  availableCopies: number
  borrowedCopies: number
  reservedCopies: number
  price: number
  condition: 'excellent' | 'good' | 'fair' | 'poor'
  status: 'available' | 'unavailable' | 'maintenance' | 'lost'
  coverImage?: string
  addedDate: string
  lastUpdated: string
  tags?: string[]
}

export interface BookBorrow {
  id: string
  bookId: string
  book?: Book
  borrowerId: string
  borrowerName: string
  borrowerType: 'student' | 'teacher' | 'staff'
  borrowDate: string
  dueDate: string
  returnDate?: string
  renewalCount: number
  maxRenewals: number
  status: 'active' | 'returned' | 'overdue' | 'lost'
  fineAmount: number
  notes?: string
  issuedBy: string
  returnedBy?: string
}

export interface BookReservation {
  id: string
  bookId: string
  book?: Book
  reserverId: string
  reserverName: string
  reserverType: 'student' | 'teacher' | 'staff'
  reservationDate: string
  expiryDate: string
  status: 'active' | 'fulfilled' | 'cancelled' | 'expired'
  priority: number
  notificationSent: boolean
}

export interface LibraryMember {
  id: string
  name: string
  email: string
  phone: string
  type: 'student' | 'teacher' | 'staff'
  studentId?: string
  employeeId?: string
  department?: string
  registrationDate: string
  status: 'active' | 'inactive' | 'suspended'
  maxBooksAllowed: number
  currentBooksCount: number
  totalFines: number
  address?: string
  photo?: string
}

export interface LibraryFine {
  id: string
  memberId: string
  memberName: string
  borrowId: string
  bookId: string
  bookTitle: string
  fineType: 'overdue' | 'damage' | 'lost' | 'other'
  amount: number
  description: string
  issueDate: string
  dueDate?: string
  paidDate?: string
  status: 'pending' | 'paid' | 'waived'
  waiveReason?: string
  issuedBy: string
  paidTo?: string
}

export interface LibraryStats {
  totalBooks: number
  totalMembers: number
  activeBorrows: number
  overdueBorrows: number
  totalReservations: number
  availableBooks: number
  borrowedBooks: number
  recentActivities: LibraryActivity[]
  popularBooks: Array<{
    book: Book
    borrowCount: number
  }>
  membershipStats: {
    students: number
    teachers: number
    staff: number
  }
  categoryStats: Array<{
    category: string
    count: number
  }>
}

export interface LibraryActivity {
  id: string
  type: 'borrow' | 'return' | 'reserve' | 'add_book' | 'fine_paid' | 'member_registered'
  description: string
  timestamp: string
  memberId?: string
  memberName?: string
  bookId?: string
  bookTitle?: string
  details?: string
}

export interface LibraryFilters {
  category?: string
  status?: string
  availability?: string
  memberType?: string
  borrowStatus?: string
  fineStatus?: string
  dateRange?: {
    from: string
    to: string
  }
}

export interface BookFilters extends LibraryFilters {
  author?: string
  publisher?: string
  language?: string
  condition?: string
  yearRange?: {
    from: number
    to: number
  }
}

export interface BorrowFilters extends LibraryFilters {
  overdue?: boolean
  returned?: boolean
}

// API Response types
export interface BooksResponse {
  books: Book[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface BorrowsResponse {
  borrows: BookBorrow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ReservationsResponse {
  reservations: BookReservation[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface MembersResponse {
  members: LibraryMember[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface FinesResponse {
  fines: LibraryFine[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Form types
export interface CreateBookRequest {
  isbn: string
  title: string
  author: string
  publisher: string
  publishedYear: number
  category: string
  subcategory?: string
  description?: string
  edition?: string
  pages?: number
  language: string
  location: string
  totalCopies: number
  price: number
  condition: 'excellent' | 'good' | 'fair' | 'poor'
  coverImage?: string
  tags?: string[]
}

export interface UpdateBookRequest extends Partial<CreateBookRequest> {
  id: string
}

export interface BorrowBookRequest {
  bookId: string
  borrowerId: string
  borrowerType: 'student' | 'teacher' | 'staff'
  dueDate: string
  notes?: string
}

export interface ReturnBookRequest {
  borrowId: string
  returnDate: string
  condition?: 'excellent' | 'good' | 'fair' | 'poor'
  notes?: string
  fineAmount?: number
}

export interface ReserveBookRequest {
  bookId: string
  reserverId: string
  reserverType: 'student' | 'teacher' | 'staff'
  expiryDate: string
}

export interface CreateMemberRequest {
  name: string
  email: string
  phone: string
  type: 'student' | 'teacher' | 'staff'
  studentId?: string
  employeeId?: string
  department?: string
  address?: string
  photo?: string
}

export interface UpdateMemberRequest extends Partial<CreateMemberRequest> {
  id: string
}

export interface CreateFineRequest {
  memberId: string
  borrowId?: string
  bookId?: string
  fineType: 'overdue' | 'damage' | 'lost' | 'other'
  amount: number
  description: string
  dueDate?: string
}

export interface PayFineRequest {
  fineId: string
  amount: number
  paymentMethod: string
  notes?: string
}