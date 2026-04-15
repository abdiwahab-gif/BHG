'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Filter, Eye, Edit, Trash2 } from 'lucide-react'
import { useEmployees } from '@/hooks/use-hr'
import { AddEmployeeDialog } from './add-employee-dialog'

export function HREmployeesTab() {
  const { 
    employees, 
    total, 
    loading, 
    error, 
    fetchEmployees, 
    createEmployee 
  } = useEmployees()

  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddDialog, setShowAddDialog] = useState(false)

  useEffect(() => {
    fetchEmployees({
      page: currentPage,
      limit: 10,
      search: searchTerm || undefined,
      department: departmentFilter !== 'all' ? departmentFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    })
  }, [fetchEmployees, currentPage, searchTerm, departmentFilter, statusFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-amber-100 text-amber-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'on-leave': return 'bg-yellow-100 text-yellow-800'
      case 'terminated': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchEmployees({
      page: 1,
      limit: 10,
      search: searchTerm || undefined,
      department: departmentFilter !== 'all' ? departmentFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Employees</h2>
          <p className="text-muted-foreground">
            Manage employee information and records
          </p>
        </div>
        <AddEmployeeDialog 
          open={showAddDialog} 
          onOpenChange={setShowAddDialog}
          onEmployeeCreated={(employee) => {
            setShowAddDialog(false)
            fetchEmployees({ page: currentPage, limit: 10 })
          }}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                placeholder="Search by name, employee ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="hr">Human Resources</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on-leave">On Leave</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Employee List</CardTitle>
            <div className="text-sm text-muted-foreground">
              {total} employees found
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading employees...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hire Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {employee.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.employeeId}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(employee.employmentStatus)}>
                        {employee.employmentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(employee.hireDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && !error && employees.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No employees found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 10 && (
        <div className="flex justify-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {currentPage} of {Math.ceil(total / 10)}
          </span>
          <Button 
            variant="outline"
            onClick={() => setCurrentPage(Math.min(Math.ceil(total / 10), currentPage + 1))}
            disabled={currentPage >= Math.ceil(total / 10)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}