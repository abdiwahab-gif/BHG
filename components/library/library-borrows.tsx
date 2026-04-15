"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  AlertTriangle,
  BookOpen,
  User,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react"
import { useBorrows } from "@/hooks/use-library"
import type { BorrowFilters, BorrowBookRequest, ReturnBookRequest } from "@/types/library"
import { useToast } from "@/hooks/use-toast"

export function LibraryBorrows() {
  const [filters, setFilters] = useState<BorrowFilters>({})
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [showBorrowDialog, setShowBorrowDialog] = useState(false)
  const [showReturnDialog, setShowReturnDialog] = useState(false)
  const [selectedBorrow, setSelectedBorrow] = useState<any>(null)
  
  const { data, loading, error, refetch, borrowBook, returnBook } = useBorrows(
    { ...filters, search: searchQuery }, 
    page, 
    10
  )
  const { toast } = useToast()

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  const handleFilterChange = (key: keyof BorrowFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }))
    setPage(1)
  }

  const handleBorrowBook = async (borrowData: BorrowBookRequest) => {
    const result = await borrowBook(borrowData)
    if (result.success) {
      toast({
        title: "Success",
        description: "Book borrowed successfully",
      })
      setShowBorrowDialog(false)
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to borrow book",
        variant: "destructive"
      })
    }
  }

  const handleReturnBook = async (returnData: ReturnBookRequest) => {
    const result = await returnBook(returnData)
    if (result.success) {
      toast({
        title: "Success",
        description: "Book returned successfully",
      })
      setShowReturnDialog(false)
      setSelectedBorrow(null)
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to return book",
        variant: "destructive"
      })
    }
  }

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'returned': return 'secondary'
      case 'overdue': return 'destructive'
      default: return 'outline'
    }
  }

  const isOverdue = (dueDate: string, status: string) => {
    return status === 'active' && new Date(dueDate) < new Date()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Borrows Management</h2>
          <p className="text-muted-foreground">
            Track book borrowing and returns
          </p>
        </div>
        <Dialog open={showBorrowDialog} onOpenChange={setShowBorrowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Borrow Book
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Borrow Book</DialogTitle>
              <DialogDescription>
                Register a new book borrowing transaction.
              </DialogDescription>
            </DialogHeader>
            <BorrowBookForm onSubmit={handleBorrowBook} onCancel={() => setShowBorrowDialog(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by member name..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Member Type</Label>
              <Select value={filters.memberType || 'all'} onValueChange={(value) => handleFilterChange('memberType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="teacher">Teachers</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Overdue Only</Label>
              <Select value={filters.overdue ? 'true' : 'false'} onValueChange={(value) => handleFilterChange('overdue', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">All Borrows</SelectItem>
                  <SelectItem value="true">Overdue Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Borrows Table */}
      <Card>
        <CardHeader>
          <CardTitle>Book Borrows</CardTitle>
          <CardDescription>
            {data ? `${data.total} borrows found` : 'Loading borrows...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={refetch} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          ) : data?.borrows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No borrows found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Book</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fine</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.borrows.map((borrow) => (
                  <TableRow key={borrow.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{borrow.borrowerName}</p>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="text-xs text-muted-foreground">
                            {borrow.borrowerType} • {borrow.borrowerId}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">Book ID: {borrow.bookId}</p>
                        {borrow.book && (
                          <p className="text-sm text-muted-foreground">{borrow.book.title}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Borrowed: {new Date(borrow.borrowDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {new Date(borrow.dueDate).toLocaleDateString()}
                        </div>
                        {borrow.returnDate && (
                          <div className="flex items-center gap-1 text-amber-600">
                            <CheckCircle className="h-3 w-3" />
                            Returned: {new Date(borrow.returnDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={getBadgeVariant(borrow.status)}>
                          {borrow.status}
                        </Badge>
                        {isOverdue(borrow.dueDate, borrow.status) && (
                          <div className="text-xs text-red-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {Math.ceil((new Date().getTime() - new Date(borrow.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue
                          </div>
                        )}
                        {borrow.renewalCount > 0 && (
                          <div className="text-xs text-blue-600">
                            Renewed {borrow.renewalCount} time(s)
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {borrow.fineAmount > 0 ? (
                        <span className="text-red-600 font-medium">
                          ${borrow.fineAmount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-amber-600">$0.00</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {(borrow.status === 'active' || borrow.status === 'overdue') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBorrow(borrow)
                              setShowReturnDialog(true)
                            }}
                          >
                            Return
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Return Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Book</DialogTitle>
            <DialogDescription>
              Process the return of the borrowed book.
            </DialogDescription>
          </DialogHeader>
          {selectedBorrow && (
            <ReturnBookForm 
              borrow={selectedBorrow} 
              onSubmit={handleReturnBook} 
              onCancel={() => {
                setShowReturnDialog(false)
                setSelectedBorrow(null)
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, data.total)} of {data.total} borrows
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Borrow Book Form Component
function BorrowBookForm({ onSubmit, onCancel }: { onSubmit: (data: BorrowBookRequest) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<BorrowBookRequest>({
    bookId: '',
    borrowerId: '',
    borrowerType: 'student',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 14 days from now
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dueDateTime = new Date(formData.dueDate + 'T23:59:59').toISOString()
    onSubmit({ ...formData, dueDate: dueDateTime })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bookId">Book ID *</Label>
        <Input
          id="bookId"
          placeholder="Enter book ID or scan barcode"
          value={formData.bookId}
          onChange={(e) => setFormData(prev => ({ ...prev, bookId: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="borrowerId">Borrower ID *</Label>
        <Input
          id="borrowerId"
          placeholder="Enter member ID or scan card"
          value={formData.borrowerId}
          onChange={(e) => setFormData(prev => ({ ...prev, borrowerId: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="borrowerType">Borrower Type *</Label>
        <Select value={formData.borrowerType} onValueChange={(value: any) => setFormData(prev => ({ ...prev, borrowerType: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="dueDate">Due Date *</Label>
        <Input
          id="dueDate"
          type="date"
          value={formData.dueDate}
          onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          placeholder="Optional notes..."
          value={formData.notes || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Borrow Book
        </Button>
      </div>
    </form>
  )
}

// Return Book Form Component
function ReturnBookForm({ borrow, onSubmit, onCancel }: { borrow: any, onSubmit: (data: ReturnBookRequest) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<ReturnBookRequest>({
    borrowId: borrow.id,
    returnDate: new Date().toISOString().split('T')[0]
  })

  const calculateFine = () => {
    const dueDate = new Date(borrow.dueDate)
    const returnDate = new Date(formData.returnDate)
    if (returnDate > dueDate) {
      const daysOverdue = Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysOverdue * 2.5 // $2.50 per day
    }
    return 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const returnDateTime = new Date(formData.returnDate + 'T' + new Date().toTimeString().split(' ')[0]).toISOString()
    onSubmit({ 
      ...formData, 
      returnDate: returnDateTime,
      fineAmount: calculateFine()
    })
  }

  const fine = calculateFine()

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-2">
        <h4 className="font-medium">Borrow Details</h4>
        <div className="grid gap-2 text-sm">
          <div>Borrower: {borrow.borrowerName}</div>
          <div>Book ID: {borrow.bookId}</div>
          <div>Borrowed: {new Date(borrow.borrowDate).toLocaleDateString()}</div>
          <div>Due: {new Date(borrow.dueDate).toLocaleDateString()}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="returnDate">Return Date *</Label>
          <Input
            id="returnDate"
            type="date"
            value={formData.returnDate}
            onChange={(e) => setFormData(prev => ({ ...prev, returnDate: e.target.value }))}
            required
          />
        </div>

        {fine > 0 && (
          <div className="rounded-lg border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-red-800 font-medium">
              <AlertTriangle className="h-4 w-4" />
              Late Return Fine
            </div>
            <p className="text-sm text-red-700 mt-1">
              Fine amount: ${fine.toFixed(2)}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="returnNotes">Return Notes</Label>
          <Input
            id="returnNotes"
            placeholder="Book condition, damages, etc..."
            value={formData.notes || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Return Book
            {fine > 0 && ` (Fine: $${fine.toFixed(2)})`}
          </Button>
        </div>
      </form>
    </div>
  )
}