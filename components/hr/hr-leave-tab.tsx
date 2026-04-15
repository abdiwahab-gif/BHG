'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useLeave } from '@/hooks/use-hr'

export function HRLeaveTab() {
  const { 
    leaveRequests, 
    total, 
    loading, 
    error, 
    fetchLeaveRequests, 
    createLeaveRequest 
  } = useLeave()

  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchLeaveRequests({
      page: currentPage,
      limit: 10,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
    })
  }, [fetchLeaveRequests, currentPage, statusFilter, typeFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-amber-100 text-amber-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Leave Management</h2>
          <p className="text-muted-foreground">
            Manage employee leave requests and approvals
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Leave Request
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Leave Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="annual leave">Annual Leave</SelectItem>
                  <SelectItem value="sick leave">Sick Leave</SelectItem>
                  <SelectItem value="personal leave">Personal Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Leave Requests</CardTitle>
            <div className="text-sm text-muted-foreground">
              {total} requests found
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading leave requests...</p>
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
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Total Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.employeeId}</TableCell>
                    <TableCell>{request.leaveType.name}</TableCell>
                    <TableCell>{new Date(request.startDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(request.endDate).toLocaleDateString()}</TableCell>
                    <TableCell>{request.totalDays} days</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(request.appliedDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {request.status === 'pending' && (
                          <>
                            <Button variant="outline" size="sm" className="text-amber-600">
                              Approve
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600">
                              Reject
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && !error && leaveRequests.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No leave requests found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}