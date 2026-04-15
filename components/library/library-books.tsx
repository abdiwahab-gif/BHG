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
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  BookOpen, 
  AlertTriangle,
  Eye,
  Copy,
  MoreHorizontal
} from "lucide-react"
import { useBooks } from "@/hooks/use-library"
import type { BookFilters, CreateBookRequest, UpdateBookRequest } from "@/types/library"
import { useToast } from "@/hooks/use-toast"

export function LibraryBooks() {
  const [filters, setFilters] = useState<BookFilters>({})
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedBook, setSelectedBook] = useState<any>(null)
  
  const { data, loading, error, refetch, createBook, updateBook, deleteBook } = useBooks(
    { ...filters, search: searchQuery }, 
    page, 
    10
  )
  const { toast } = useToast()

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  const handleFilterChange = (key: keyof BookFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }))
    setPage(1)
  }

  const handleAddBook = async (bookData: CreateBookRequest) => {
    const result = await createBook(bookData)
    if (result.success) {
      toast({
        title: "Success",
        description: "Book added successfully",
      })
      setShowAddDialog(false)
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to add book",
        variant: "destructive"
      })
    }
  }

  const handleEditBook = async (bookData: UpdateBookRequest) => {
    const result = await updateBook(bookData)
    if (result.success) {
      toast({
        title: "Success",
        description: "Book updated successfully",
      })
      setShowEditDialog(false)
      setSelectedBook(null)
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update book",
        variant: "destructive"
      })
    }
  }

  const handleDeleteBook = async (bookId: string) => {
    if (!window.confirm("Are you sure you want to delete this book?")) return
    
    const result = await deleteBook(bookId)
    if (result.success) {
      toast({
        title: "Success",
        description: "Book deleted successfully",
      })
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete book",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Books Management</h2>
          <p className="text-muted-foreground">
            Manage your library's book collection
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Book
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Book</DialogTitle>
              <DialogDescription>
                Enter the details of the new book to add to the library collection.
              </DialogDescription>
            </DialogHeader>
            <AddBookForm onSubmit={handleAddBook} onCancel={() => setShowAddDialog(false)} />
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
                  placeholder="Search books..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={filters.category || 'all'} onValueChange={(value) => handleFilterChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Computer Science">Computer Science</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Physics">Physics</SelectItem>
                  <SelectItem value="Literature">Literature</SelectItem>
                  <SelectItem value="History">History</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Medicine">Medicine</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Availability</Label>
              <Select value={filters.availability || 'all'} onValueChange={(value) => handleFilterChange('availability', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Books" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Books</SelectItem>
                  <SelectItem value="available">Available Now</SelectItem>
                  <SelectItem value="unavailable">Currently Borrowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Books Table */}
      <Card>
        <CardHeader>
          <CardTitle>Books Collection</CardTitle>
          <CardDescription>
            {data ? `${data.total} books found` : 'Loading books...'}
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
          ) : data?.books.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No books found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book Details</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Copies</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.books.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{book.title}</p>
                        <p className="text-sm text-muted-foreground">by {book.author}</p>
                        <p className="text-xs text-muted-foreground">ISBN: {book.isbn}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{book.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div>Total: {book.totalCopies}</div>
                        <div className="text-amber-600">Available: {book.availableCopies}</div>
                        <div className="text-blue-600">Borrowed: {book.borrowedCopies}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          book.status === 'available' ? 'default' :
                          book.status === 'unavailable' ? 'secondary' :
                          book.status === 'maintenance' ? 'outline' : 'destructive'
                        }
                      >
                        {book.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">{book.location}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBook(book)
                            setShowEditDialog(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBook(book.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
            <DialogDescription>
              Update the book details.
            </DialogDescription>
          </DialogHeader>
          {selectedBook && (
            <EditBookForm 
              book={selectedBook} 
              onSubmit={handleEditBook} 
              onCancel={() => {
                setShowEditDialog(false)
                setSelectedBook(null)
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, data.total)} of {data.total} books
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

// Add Book Form Component
function AddBookForm({ onSubmit, onCancel }: { onSubmit: (data: CreateBookRequest) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<CreateBookRequest>({
    isbn: '',
    title: '',
    author: '',
    publisher: '',
    publishedYear: new Date().getFullYear(),
    category: '',
    language: 'English',
    location: '',
    totalCopies: 1,
    price: 0,
    condition: 'excellent'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="isbn">ISBN *</Label>
          <Input
            id="isbn"
            value={formData.isbn}
            onChange={(e) => setFormData(prev => ({ ...prev, isbn: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="author">Author *</Label>
          <Input
            id="author"
            value={formData.author}
            onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="publisher">Publisher *</Label>
          <Input
            id="publisher"
            value={formData.publisher}
            onChange={(e) => setFormData(prev => ({ ...prev, publisher: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="publishedYear">Published Year</Label>
          <Input
            id="publishedYear"
            type="number"
            value={formData.publishedYear}
            onChange={(e) => setFormData(prev => ({ ...prev, publishedYear: parseInt(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Computer Science">Computer Science</SelectItem>
              <SelectItem value="Engineering">Engineering</SelectItem>
              <SelectItem value="Mathematics">Mathematics</SelectItem>
              <SelectItem value="Physics">Physics</SelectItem>
              <SelectItem value="Literature">Literature</SelectItem>
              <SelectItem value="History">History</SelectItem>
              <SelectItem value="Business">Business</SelectItem>
              <SelectItem value="Medicine">Medicine</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select value={formData.language} onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="Arabic">Arabic</SelectItem>
              <SelectItem value="French">French</SelectItem>
              <SelectItem value="Spanish">Spanish</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location *</Label>
          <Input
            id="location"
            placeholder="e.g., CS-A1-01"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalCopies">Total Copies</Label>
          <Input
            id="totalCopies"
            type="number"
            min="1"
            value={formData.totalCopies}
            onChange={(e) => setFormData(prev => ({ ...prev, totalCopies: parseInt(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Price ($)</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="condition">Condition</Label>
          <Select value={formData.condition} onValueChange={(value: any) => setFormData(prev => ({ ...prev, condition: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excellent">Excellent</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="poor">Poor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Brief description of the book..."
          value={formData.description || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Add Book
        </Button>
      </div>
    </form>
  )
}

// Edit Book Form Component
function EditBookForm({ book, onSubmit, onCancel }: { book: any, onSubmit: (data: UpdateBookRequest) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<UpdateBookRequest>({
    id: book.id,
    isbn: book.isbn,
    title: book.title,
    author: book.author,
    publisher: book.publisher,
    publishedYear: book.publishedYear,
    category: book.category,
    language: book.language,
    location: book.location,
    totalCopies: book.totalCopies,
    price: book.price,
    condition: book.condition,
    description: book.description
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-isbn">ISBN *</Label>
          <Input
            id="edit-isbn"
            value={formData.isbn}
            onChange={(e) => setFormData(prev => ({ ...prev, isbn: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-title">Title *</Label>
          <Input
            id="edit-title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-author">Author *</Label>
          <Input
            id="edit-author"
            value={formData.author}
            onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-publisher">Publisher *</Label>
          <Input
            id="edit-publisher"
            value={formData.publisher}
            onChange={(e) => setFormData(prev => ({ ...prev, publisher: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-publishedYear">Published Year</Label>
          <Input
            id="edit-publishedYear"
            type="number"
            value={formData.publishedYear}
            onChange={(e) => setFormData(prev => ({ ...prev, publishedYear: parseInt(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-category">Category *</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Computer Science">Computer Science</SelectItem>
              <SelectItem value="Engineering">Engineering</SelectItem>
              <SelectItem value="Mathematics">Mathematics</SelectItem>
              <SelectItem value="Physics">Physics</SelectItem>
              <SelectItem value="Literature">Literature</SelectItem>
              <SelectItem value="History">History</SelectItem>
              <SelectItem value="Business">Business</SelectItem>
              <SelectItem value="Medicine">Medicine</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-language">Language</Label>
          <Select value={formData.language} onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="Arabic">Arabic</SelectItem>
              <SelectItem value="French">French</SelectItem>
              <SelectItem value="Spanish">Spanish</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-location">Location *</Label>
          <Input
            id="edit-location"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-totalCopies">Total Copies</Label>
          <Input
            id="edit-totalCopies"
            type="number"
            min="1"
            value={formData.totalCopies}
            onChange={(e) => setFormData(prev => ({ ...prev, totalCopies: parseInt(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-price">Price ($)</Label>
          <Input
            id="edit-price"
            type="number"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-condition">Condition</Label>
          <Select value={formData.condition} onValueChange={(value: any) => setFormData(prev => ({ ...prev, condition: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excellent">Excellent</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="poor">Poor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-description">Description</Label>
        <Textarea
          id="edit-description"
          value={formData.description || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Update Book
        </Button>
      </div>
    </form>
  )
}