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
import { Search, Filter, FileText, Calendar, DollarSign, CreditCard, AlertTriangle, Plus } from "lucide-react"
import { Bill, BillFilters } from "@/types/finance"
import { NewBillForm } from "./new-bill-form"

export function BillsTable() {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<BillFilters>({
    page: 1,
    limit: 10
  })
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")

  useEffect(() => {
    fetchBills()
  }, [filters])

  const fetchBills = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/finance/bills?${queryParams}`)
      const data = await response.json()
      setBills(data.bills || [])
    } catch (error) {
      console.error('Error fetching bills:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!selectedBill || !paymentAmount || !paymentMethod) return

    try {
      const response = await fetch(`/api/finance/bills/${selectedBill.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          billId: selectedBill.id,
          amount: parseFloat(paymentAmount),
          paymentMethod,
          paymentDate: new Date().toISOString().split('T')[0],
          reference: `PAY-${Date.now()}`,
          totalAmount: selectedBill.totalAmount
        })
      })

      if (response.ok) {
        setSelectedBill(null)
        setPaymentAmount("")
        setPaymentMethod("")
        fetchBills() // Refresh the list
      }
    } catch (error) {
      console.error('Error processing payment:', error)
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
      PENDING: "bg-yellow-100 text-yellow-800",
      PAID: "bg-amber-100 text-amber-800",
      OVERDUE: "bg-red-100 text-red-800",
      PARTIAL: "bg-blue-100 text-blue-800",
      CANCELLED: "bg-gray-100 text-gray-800"
    }
    return statusStyles[status as keyof typeof statusStyles] || "bg-gray-100 text-gray-800"
  }

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'PAID') return false
    return new Date(dueDate) < new Date()
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
                  placeholder="Bill number or vendor..."
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
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="overdue">Overdue Bills</Label>
              <Select
                value={filters.overdue ? "true" : "false"}
                onValueChange={(value) => setFilters({ ...filters, overdue: value === "true", page: 1 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All bills" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">All bills</SelectItem>
                  <SelectItem value="true">Overdue only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    New Bill
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Bill</DialogTitle>
                    <DialogDescription>
                      Add a new bill or invoice to the system.
                    </DialogDescription>
                  </DialogHeader>
                  <NewBillForm onSuccess={() => {
                    fetchBills()
                  }} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Bills & Accounts Payable
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
                    <TableHead>Bill Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Bill Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">
                        {bill.billNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{bill.vendor.name}</p>
                          <p className="text-sm text-muted-foreground">{bill.vendor.contactPerson}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(bill.billDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${isOverdue(bill.dueDate, bill.status) ? 'text-red-600' : ''}`}>
                          <Calendar className="h-4 w-4" />
                          {new Date(bill.dueDate).toLocaleDateString()}
                          {isOverdue(bill.dueDate, bill.status) && (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(bill.totalAmount)}
                      </TableCell>
                      <TableCell className="text-amber-600">
                        {formatCurrency(bill.amountPaid)}
                      </TableCell>
                      <TableCell className={bill.amountDue > 0 ? "text-red-600 font-medium" : "text-amber-600"}>
                        {formatCurrency(bill.amountDue)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(bill.status)}>
                          {bill.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <FileText className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {bill.amountDue > 0 && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedBill(bill)}
                                >
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  Pay
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Record Bill Payment</DialogTitle>
                                  <DialogDescription>
                                    Record a payment for {bill.vendor.name} - {bill.billNumber}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Vendor</Label>
                                      <p className="text-sm text-muted-foreground">
                                        {bill.vendor.name}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Amount Due</Label>
                                      <p className="text-sm font-medium text-red-600">
                                        {formatCurrency(bill.amountDue)}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label htmlFor="payment-amount">Payment Amount</Label>
                                    <div className="relative">
                                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                      <Input
                                        id="payment-amount"
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="pl-10"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label htmlFor="payment-method">Payment Method</Label>
                                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select payment method" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="CASH">Cash</SelectItem>
                                        <SelectItem value="CHECK">Check</SelectItem>
                                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                        <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                                        <SelectItem value="ACH">ACH</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    onClick={handlePayment}
                                    disabled={!paymentAmount || !paymentMethod}
                                  >
                                    Record Payment
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
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