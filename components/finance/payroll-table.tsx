"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Filter, Users, Calendar, DollarSign, Play, FileText } from "lucide-react"
import { PayrollRun, PayrollFilters } from "@/types/finance"

export function PayrollTable() {
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<PayrollFilters>({
    page: 1,
    limit: 10
  })

  useEffect(() => {
    fetchPayrollRuns()
  }, [filters])

  const fetchPayrollRuns = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/finance/payroll?${queryParams}`)
      const data = await response.json()
      setPayrollRuns(data.payrollRuns || [])
    } catch (error) {
      console.error('Error fetching payroll runs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      DRAFT: "bg-gray-100 text-gray-800",
      CALCULATED: "bg-blue-100 text-blue-800",
      APPROVED: "bg-amber-100 text-amber-800",
      PAID: "bg-amber-100 text-amber-800",
      CANCELLED: "bg-red-100 text-red-800"
    }
    return statusStyles[status as keyof typeof statusStyles] || "bg-gray-100 text-gray-800"
  }

  const runPayroll = async () => {
    try {
      const response = await fetch('/api/finance/payroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payPeriodStart: new Date().toISOString().split('T')[0],
          payPeriodEnd: new Date().toISOString().split('T')[0],
          payDate: new Date().toISOString().split('T')[0]
        })
      })

      if (response.ok) {
        fetchPayrollRuns() // Refresh the list
      }
    } catch (error) {
      console.error('Error running payroll:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Payroll number..."
                  className="pl-10"
                  value={filters.search || ""}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? undefined : value, page: 1 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="CALCULATED">Calculated</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={filters.department || "all"}
                onValueChange={(value) => setFilters({ ...filters, department: value === "all" ? undefined : value, page: 1 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  <SelectItem value="Academic">Academic</SelectItem>
                  <SelectItem value="Administration">Administration</SelectItem>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={runPayroll} className="w-full">
                <Play className="h-4 w-4 mr-2" />
                Run New Payroll
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Payroll Runs
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payroll Number</TableHead>
                    <TableHead>Pay Period</TableHead>
                    <TableHead>Pay Date</TableHead>
                    <TableHead>Employee Count</TableHead>
                    <TableHead>Gross Pay</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRuns.map((payroll) => (
                    <TableRow key={payroll.id}>
                      <TableCell className="font-medium">
                        {payroll.payrollNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(payroll.payPeriodStart).toLocaleDateString()} - {new Date(payroll.payPeriodEnd).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(payroll.payDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {payroll.employeeCount || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-blue-600">
                        {formatCurrency(payroll.totalGrossPay)}
                      </TableCell>
                      <TableCell className="text-red-600">
                        {formatCurrency(payroll.totalDeductions)}
                      </TableCell>
                      <TableCell className="text-amber-600 font-medium">
                        {formatCurrency(payroll.totalNetPay)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(payroll.status)}>
                          {payroll.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <FileText className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {payroll.status === 'CALCULATED' && (
                            <Button variant="outline" size="sm">
                              Approve
                            </Button>
                          )}
                          {payroll.status === 'APPROVED' && (
                            <Button variant="outline" size="sm">
                              Pay
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}