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
  DollarSign, 
  AlertTriangle,
  Calendar,
  BookOpen,
  User,
  CreditCard,
  CheckCircle,
  XCircle
} from "lucide-react"
import { useFines } from "@/hooks/use-library"
import type { LibraryFilters, CreateFineRequest, PayFineRequest } from "@/types/library"
import { useToast } from "@/hooks/use-toast"

export function LibraryFines() {
  const [filters, setFilters] = useState<LibraryFilters>({})
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [selectedFine, setSelectedFine] = useState<any>(null)
  
  const { data, loading, error, refetch, createFine, payFine, waiveFine } = useFines(
    { ...filters, search: searchQuery }, 
    page, 
    10
  )
  const { toast } = useToast()

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  const handleFilterChange = (key: keyof LibraryFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }))
    setPage(1)
  }

  const handleAddFine = async (fineData: CreateFineRequest) => {
    const result = await createFine(fineData)
    if (result.success) {
      toast({
        title: "Success",
        description: "Fine created successfully",
      })
      setShowAddDialog(false)
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to create fine",
        variant: "destructive"
      })
    }
  }

  const handlePayFine = async (paymentData: PayFineRequest) => {
    const result = await payFine(paymentData)
    if (result.success) {
      toast({
        title: "Success",
        description: "Fine paid successfully",
      })
      setShowPayDialog(false)
      setSelectedFine(null)
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to process payment",
        variant: "destructive"
      })
    }
  }

  const handleWaiveFine = async (fineId: string) => {
    const reason = window.prompt("Enter reason for waiving this fine:")
    if (reason === null) return // User cancelled
    
    const result = await waiveFine(fineId, reason)
    if (result.success) {
      toast({
        title: "Success",
        description: "Fine waived successfully",
      })
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to waive fine",
        variant: "destructive"
      })
    }
  }

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'destructive'
      case 'paid': return 'default'
      case 'waived': return 'secondary'
      default: return 'outline'
    }
  }

  const getFineTypeIcon = (type: string) => {
    switch (type) {
      case 'overdue': return <Clock className="h-4 w-4" />
      case 'damage': return <AlertTriangle className="h-4 w-4" />
      case 'lost': return <XCircle className="h-4 w-4" />
      default: return <DollarSign className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fines Management</h2>
          <p className="text-muted-foreground">
            Track and manage library fines and penalties
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Fine
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Fine</DialogTitle>
              <DialogDescription>
                Issue a new fine to a library member.
              </DialogDescription>
            </DialogHeader>
            <AddFineForm onSubmit={handleAddFine} onCancel={() => setShowAddDialog(false)} />
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="waived">Waived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fine Type</Label>
              <Select value={filters.fineStatus || 'all'} onValueChange={(value) => handleFilterChange('fineStatus', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="lost">Lost Book</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fines Table */}
      <Card>
        <CardHeader>
          <CardTitle>Library Fines</CardTitle>
          <CardDescription>
            {data ? `${data.total} fines found` : 'Loading fines...'}
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
          ) : data?.fines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <DollarSign className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No fines found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Book</TableHead>
                  <TableHead>Fine Details</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.fines.map((fine) => (
                  <TableRow key={fine.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{fine.memberName}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {fine.memberId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{fine.bookTitle}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <BookOpen className="h-3 w-3" />
                          {fine.bookId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          {getFineTypeIcon(fine.fineType)}
                          <Badge variant="outline" className="text-xs">
                            {fine.fineType}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {fine.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-red-600">
                        ${fine.amount.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(fine.status)}>
                        {fine.status}
                      </Badge>
                      {fine.status === 'waived' && fine.waiveReason && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {fine.waiveReason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Issued: {new Date(fine.issueDate).toLocaleDateString()}
                        </div>
                        {fine.dueDate && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due: {new Date(fine.dueDate).toLocaleDateString()}
                          </div>
                        )}
                        {fine.paidDate && (
                          <div className="flex items-center gap-1 text-amber-600">
                            <CheckCircle className="h-3 w-3" />
                            Paid: {new Date(fine.paidDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {fine.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedFine(fine)
                                setShowPayDialog(true)
                              }}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Pay
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleWaiveFine(fine.id)}
                            >
                              Waive
                            </Button>
                          </>
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

      {/* Pay Fine Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Fine</DialogTitle>
            <DialogDescription>
              Process fine payment.
            </DialogDescription>
          </DialogHeader>
          {selectedFine && (
            <PayFineForm 
              fine={selectedFine} 
              onSubmit={handlePayFine} 
              onCancel={() => {
                setShowPayDialog(false)
                setSelectedFine(null)
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, data.total)} of {data.total} fines
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

// Add Fine Form Component
function AddFineForm({ onSubmit, onCancel }: { onSubmit: (data: CreateFineRequest) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<CreateFineRequest>({
    memberId: '',
    fineType: 'overdue',
    amount: 0,
    description: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="memberId">Member ID *</Label>
        <Input
          id="memberId"
          placeholder="Enter member ID"
          value={formData.memberId}
          onChange={(e) => setFormData(prev => ({ ...prev, memberId: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bookId">Book ID</Label>
        <Input
          id="bookId"
          placeholder="Enter book ID (optional)"
          value={formData.bookId || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, bookId: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="borrowId">Borrow ID</Label>
        <Input
          id="borrowId"
          placeholder="Enter borrow ID (optional)"
          value={formData.borrowId || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, borrowId: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fineType">Fine Type *</Label>
        <Select value={formData.fineType} onValueChange={(value: any) => setFormData(prev => ({ ...prev, fineType: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="damage">Damage</SelectItem>
            <SelectItem value="lost">Lost Book</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">Amount ($) *</Label>
        <Input
          id="amount"
          type="number"
          min="0"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Input
          id="description"
          placeholder="Describe the reason for the fine"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dueDate">Due Date</Label>
        <Input
          id="dueDate"
          type="date"
          value={formData.dueDate || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create Fine
        </Button>
      </div>
    </form>
  )
}

// Pay Fine Form Component
function PayFineForm({ fine, onSubmit, onCancel }: { fine: any, onSubmit: (data: PayFineRequest) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<PayFineRequest>({
    fineId: fine.id,
    amount: fine.amount,
    paymentMethod: 'cash'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-2">
        <h4 className="font-medium">Fine Details</h4>
        <div className="grid gap-2 text-sm">
          <div>Member: {fine.memberName}</div>
          <div>Book: {fine.bookTitle}</div>
          <div>Type: {fine.fineType}</div>
          <div>Description: {fine.description}</div>
          <div className="font-medium text-red-600">Amount: ${fine.amount.toFixed(2)}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Payment Amount ($) *</Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Payment Method *</Label>
          <Select value={formData.paymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Credit/Debit Card</SelectItem>
              <SelectItem value="check">Check</SelectItem>
              <SelectItem value="online">Online Payment</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Payment Notes</Label>
          <Input
            id="notes"
            placeholder="Optional payment notes..."
            value={formData.notes || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          />
        </div>
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Process Payment
          </Button>
        </div>
      </form>
    </div>
  )
}