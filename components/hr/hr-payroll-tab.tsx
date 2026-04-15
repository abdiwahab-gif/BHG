'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, DollarSign, Download, Eye } from 'lucide-react'
import { usePayroll } from '@/hooks/use-hr'

export function HRPayrollTab() {
  const { 
    payrollRecords, 
    total, 
    loading, 
    error, 
    fetchPayrollRecords, 
    createPayrollRecord 
  } = usePayroll()

  const [statusFilter, setStatusFilter] = useState('all')
  const [payPeriodFilter, setPayPeriodFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchPayrollRecords({
      page: currentPage,
      limit: 10,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      payPeriod: payPeriodFilter || undefined,
    })
  }, [fetchPayrollRecords, currentPage, statusFilter, payPeriodFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-amber-100 text-amber-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Payroll Management</h2>
          <p className="text-muted-foreground">
            Manage employee salaries, benefits, and payroll processing
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Process Payroll
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payroll (Current Month)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$125,430</div>
            <p className="text-xs text-muted-foreground">
              Across all employees
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed Records</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollRecords.filter(p => p.status === 'paid').length}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollRecords.filter(p => p.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">
              Require approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Payroll Records</CardTitle>
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
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input
                type="month"
                placeholder="Pay Period"
                value={payPeriodFilter}
                onChange={(e) => setPayPeriodFilter(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Payroll Records</CardTitle>
            <div className="text-sm text-muted-foreground">
              {total} records found
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading payroll records...</p>
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
                  <TableHead>Pay Period</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.employeeId}</TableCell>
                    <TableCell>
                      {new Date(record.payPeriodStart).toLocaleDateString()} - {new Date(record.payPeriodEnd).toLocaleDateString()}
                    </TableCell>
                    <TableCell>${record.baseSalary.toLocaleString()}</TableCell>
                    <TableCell>${record.grossPay.toLocaleString()}</TableCell>
                    <TableCell>${record.netPay.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(record.status)}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(record.payDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {record.payslipGenerated && (
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && !error && payrollRecords.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No payroll records found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}