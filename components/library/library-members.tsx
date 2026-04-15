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
  Edit, 
  Trash2, 
  Users, 
  AlertTriangle,
  User,
  GraduationCap,
  UserCheck,
  Building,
  Mail,
  Phone
} from "lucide-react"
import { useMembers } from "@/hooks/use-library"
import type { LibraryFilters, CreateMemberRequest, UpdateMemberRequest } from "@/types/library"
import { useToast } from "@/hooks/use-toast"

export function LibraryMembers() {
  const [filters, setFilters] = useState<LibraryFilters>({})
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedMember, setSelectedMember] = useState<any>(null)
  
  const { data, loading, error, refetch, createMember, updateMember, deleteMember } = useMembers(
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

  const handleAddMember = async (memberData: CreateMemberRequest) => {
    const result = await createMember(memberData)
    if (result.success) {
      toast({
        title: "Success",
        description: "Member added successfully",
      })
      setShowAddDialog(false)
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to add member",
        variant: "destructive"
      })
    }
  }

  const handleEditMember = async (memberData: UpdateMemberRequest) => {
    const result = await updateMember(memberData)
    if (result.success) {
      toast({
        title: "Success",
        description: "Member updated successfully",
      })
      setShowEditDialog(false)
      setSelectedMember(null)
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update member",
        variant: "destructive"
      })
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm("Are you sure you want to delete this member?")) return
    
    const result = await deleteMember(memberId)
    if (result.success) {
      toast({
        title: "Success",
        description: "Member deleted successfully",
      })
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete member",
        variant: "destructive"
      })
    }
  }

  const getMemberIcon = (type: string) => {
    switch (type) {
      case 'student': return <GraduationCap className="h-4 w-4" />
      case 'teacher': return <UserCheck className="h-4 w-4" />
      case 'staff': return <Building className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'inactive': return 'secondary'
      case 'suspended': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Members Management</h2>
          <p className="text-muted-foreground">
            Manage library members and their accounts
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
              <DialogDescription>
                Register a new library member.
              </DialogDescription>
            </DialogHeader>
            <AddMemberForm onSubmit={handleAddMember} onCancel={() => setShowAddDialog(false)} />
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
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
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
              <Label>Status</Label>
              <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Library Members</CardTitle>
          <CardDescription>
            {data ? `${data.total} members found` : 'Loading members...'}
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
          ) : data?.members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Users className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No members found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member Details</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Books & Fines</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getMemberIcon(member.type)}
                          <p className="font-medium">{member.name}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {member.type} • {member.studentId || member.employeeId}
                        </p>
                        <p className="text-xs text-muted-foreground">ID: {member.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">{member.email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{member.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{member.department || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div>
                          Books: {member.currentBooksCount}/{member.maxBooksAllowed}
                        </div>
                        <div className={member.totalFines > 0 ? "text-red-600 font-medium" : "text-amber-600"}>
                          Fines: ${member.totalFines.toFixed(2)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(member.status)}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {new Date(member.registrationDate).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedMember(member)
                            setShowEditDialog(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMember(member.id)}
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
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update member information.
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <EditMemberForm 
              member={selectedMember} 
              onSubmit={handleEditMember} 
              onCancel={() => {
                setShowEditDialog(false)
                setSelectedMember(null)
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, data.total)} of {data.total} members
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

// Add Member Form Component
function AddMemberForm({ onSubmit, onCancel }: { onSubmit: (data: CreateMemberRequest) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<CreateMemberRequest>({
    name: '',
    email: '',
    phone: '',
    type: 'student'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Member Type *</Label>
          <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
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
        {formData.type === 'student' && (
          <div className="space-y-2">
            <Label htmlFor="studentId">Student ID</Label>
            <Input
              id="studentId"
              value={formData.studentId || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
            />
          </div>
        )}
        {(formData.type === 'teacher' || formData.type === 'staff') && (
          <div className="space-y-2">
            <Label htmlFor="employeeId">Employee ID</Label>
            <Input
              id="employeeId"
              value={formData.employeeId || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            value={formData.department || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Add Member
        </Button>
      </div>
    </form>
  )
}

// Edit Member Form Component
function EditMemberForm({ member, onSubmit, onCancel }: { member: any, onSubmit: (data: UpdateMemberRequest) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<UpdateMemberRequest>({
    id: member.id,
    name: member.name,
    email: member.email,
    phone: member.phone,
    type: member.type,
    studentId: member.studentId,
    employeeId: member.employeeId,
    department: member.department,
    address: member.address
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Full Name *</Label>
          <Input
            id="edit-name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-email">Email *</Label>
          <Input
            id="edit-email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-phone">Phone</Label>
          <Input
            id="edit-phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-type">Member Type *</Label>
          <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
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
        {formData.type === 'student' && (
          <div className="space-y-2">
            <Label htmlFor="edit-studentId">Student ID</Label>
            <Input
              id="edit-studentId"
              value={formData.studentId || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
            />
          </div>
        )}
        {(formData.type === 'teacher' || formData.type === 'staff') && (
          <div className="space-y-2">
            <Label htmlFor="edit-employeeId">Employee ID</Label>
            <Input
              id="edit-employeeId"
              value={formData.employeeId || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="edit-department">Department</Label>
          <Input
            id="edit-department"
            value={formData.department || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-address">Address</Label>
        <Input
          id="edit-address"
          value={formData.address || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Update Member
        </Button>
      </div>
    </form>
  )
}