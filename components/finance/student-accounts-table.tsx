"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Filter, DollarSign, Calendar, User, Plus, CreditCard } from "lucide-react"
import { StudentAccount, StudentAccountFilters } from "@/types/finance"
import { useToast } from "@/hooks/use-toast"
import { getAuditHeaders } from "@/lib/client-audit"
import { ToastAction } from "@/components/ui/toast"

type AcademicSession = {
  id: string
  name: string
  isActive?: boolean
}

type AcademicSemester = {
  id: string
  name: string
  sessionId: string
}

export function StudentAccountsTable() {
  const { toast } = useToast()
  const router = useRouter()
  const [accounts, setAccounts] = useState<StudentAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<StudentAccountFilters>({
    page: 1,
    limit: 10
  })
  const [selectedAccount, setSelectedAccount] = useState<StudentAccount | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [sessions, setSessions] = useState<AcademicSession[]>([])
  const [semesters, setSemesters] = useState<AcademicSemester[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>("")
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("")

  useEffect(() => {
    fetchAccounts()
  }, [filters])

  const fetchAccounts = async (options?: { showLoading?: boolean }) => {
    try {
      const showLoading = options?.showLoading !== false
      if (showLoading) setLoading(true)
      const queryParams = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/finance/student-accounts?${queryParams}`, { cache: "no-store" })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        const message =
          (err && typeof err.message === "string" && err.message) ||
          (err && typeof err.error === "string" && err.error) ||
          `Request failed (${response.status})`
        throw new Error(message)
      }

      const data = await response.json()
      setAccounts(data.studentAccounts || [])
    } catch (error) {
      console.error('Error fetching student accounts:', error)
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  const resetPaymentForm = () => {
    setPaymentAmount("")
    setPaymentMethod("")
    setSelectedSessionId("")
    setSelectedSemesterId("")
  }

  const loadSessions = async (): Promise<AcademicSession[]> => {
    const res = await fetch("/api/sessions", { cache: "no-store" })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      const message = body?.message || body?.error || `Failed to load sessions (${res.status})`
      throw new Error(message)
    }

    const list = Array.isArray(body?.data?.sessions) ? body.data.sessions : []
    return list
      .map((s: any) => ({
        id: String(s.id),
        name: String(s.name),
        isActive: Boolean(s.isActive),
      }))
      .filter((s: AcademicSession) => Boolean(s.id) && Boolean(s.name))
  }

  const loadSemesters = async (sessionId: string): Promise<AcademicSemester[]> => {
    if (!sessionId) return []
    const res = await fetch(`/api/semesters?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      const message = body?.message || body?.error || `Failed to load semesters (${res.status})`
      throw new Error(message)
    }

    const list = Array.isArray(body?.data) ? body.data : []
    return list
      .map((s: any) => ({
        id: String(s.id),
        name: String(s.name),
        sessionId: String(s.sessionId),
      }))
      .filter((s: AcademicSemester) => Boolean(s.id) && Boolean(s.name) && Boolean(s.sessionId))
  }

  const openPaymentDialog = async (account?: StudentAccount) => {
    setSelectedAccount(account || null)
    resetPaymentForm()
    setPaymentDialogOpen(true)

    try {
      const nextSessions = await loadSessions()
      setSessions(nextSessions)

      const active = nextSessions.find((s) => s.isActive)
      const defaultSessionId = active?.id || nextSessions[0]?.id || ""
      setSelectedSessionId(defaultSessionId)

      if (defaultSessionId) {
        const nextSemesters = await loadSemesters(defaultSessionId)
        setSemesters(nextSemesters)
        setSelectedSemesterId(nextSemesters[0]?.id || "")
      } else {
        setSemesters([])
        setSelectedSemesterId("")
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load sessions/semesters"
      toast({ title: "Error", description: message, variant: "destructive" })
    }
  }

  const handlePayment = async () => {
    if (!selectedAccount || !paymentAmount || !paymentMethod) return
    if (isProcessingPayment) return

    try {
      setIsProcessingPayment(true)
      const response = await fetch(`/api/finance/student-accounts/${selectedAccount.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuditHeaders(),
        },
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          paymentMethod,
          paymentDate: new Date().toISOString().split('T')[0],
          reference: `PAY-${Date.now()}`,
          sessionId: selectedSessionId || undefined,
          semesterId: selectedSemesterId || undefined,
        })
      })

      const body = await response.json().catch(() => null)

      if (!response.ok) {
        const message =
          body?.message ||
          body?.error ||
          `Payment failed (${response.status})`
        throw new Error(message)
      }

      const transactionId = typeof body?.transactionId === "string" ? body.transactionId : ""

      toast({
        title: "Success",
        description: transactionId ? `Payment recorded (ID: ${transactionId})` : "Payment recorded successfully",
        action: transactionId ? (
          <ToastAction altText="View payment" onClick={() => router.push(`/finance/payments/${transactionId}`)}>
            View
          </ToastAction>
        ) : undefined,
      })

      setPaymentDialogOpen(false)
      setSelectedAccount(null)
      resetPaymentForm()
      await fetchAccounts({ showLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process payment"
      console.error('Error processing payment:', error)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsProcessingPayment(false)
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
      CURRENT: "bg-amber-100 text-amber-800",
      PAID: "bg-green-100 text-green-800",
      OVERDUE: "bg-red-100 text-red-800",
      PARTIAL: "bg-yellow-100 text-yellow-800"
    }
    return statusStyles[status as keyof typeof statusStyles] || "bg-gray-100 text-gray-800"
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
                  placeholder="Student name or ID..."
                  className="pl-10"
                  value={filters.search || ""}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <Select
                value={filters.paymentStatus || "all"}
                onValueChange={(value) => setFilters({ ...filters, paymentStatus: value === "all" ? undefined : value, page: 1 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="CURRENT">Current</SelectItem>
                  <SelectItem value="PARTIAL">Partial Payment</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Select
                value={filters.semester || "all"}
                onValueChange={(value) => setFilters({ ...filters, semester: value === "all" ? undefined : value, page: 1 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All semesters</SelectItem>
                  <SelectItem value="Fall 2024">Fall 2024</SelectItem>
                  <SelectItem value="Spring 2024">Spring 2024</SelectItem>
                  <SelectItem value="Summer 2024">Summer 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="program">Program</Label>
              <Select
                value={filters.program || "all"}
                onValueChange={(value) => setFilters({ ...filters, program: value === "all" ? undefined : value, page: 1 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All programs</SelectItem>
                  <SelectItem value="Computer Science">Computer Science</SelectItem>
                  <SelectItem value="Business Administration">Business Administration</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Student Accounts
            </div>
            <Button onClick={() => openPaymentDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </Button>
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
                    <TableHead>Student</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Total Fees</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Balance Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Payment</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        {account.studentName}
                      </TableCell>
                      <TableCell>{account.studentNumber}</TableCell>
                      <TableCell>{account.program}</TableCell>
                      <TableCell>{account.semester}</TableCell>
                      <TableCell>{formatCurrency(account.totalFeesDue)}</TableCell>
                      <TableCell className="text-amber-600">
                        {formatCurrency(account.totalPaid)}
                      </TableCell>
                      <TableCell className={Number(account.accountBalance) > 0 ? "text-red-600 font-medium" : "text-amber-600"}>
                        {formatCurrency(account.accountBalance)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(account.paymentStatus)}>
                          {account.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {account.lastPaymentDate ? new Date(account.lastPaymentDate).toLocaleDateString() : 'No payments'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openPaymentDialog(account)}>
                            <CreditCard className="h-4 w-4 mr-1" />
                            Pay
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/finance/payments?studentId=${encodeURIComponent(account.id)}`)}
                          >
                            View
                          </Button>
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

      <Dialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open)
          if (!open) {
            setSelectedAccount(null)
            resetPaymentForm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Record a student payment and tie it to an academic session and semester.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Student</Label>
              {selectedAccount ? (
                <p className="text-sm text-muted-foreground">{selectedAccount.studentName}</p>
              ) : (
                <Select
                  onValueChange={(value) => {
                    const account = accounts.find((acc) => acc.id === value)
                    setSelectedAccount(account || null)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.studentName} - Balance: {formatCurrency(account.accountBalance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedAccount ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Balance Due</Label>
                  <p className="text-sm font-medium text-red-600">{formatCurrency(selectedAccount.accountBalance)}</p>
                </div>
                <div>
                  <Label>Student ID</Label>
                  <p className="text-sm text-muted-foreground">{selectedAccount.studentNumber}</p>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Academic Session</Label>
                <Select
                  value={selectedSessionId}
                  onValueChange={async (value) => {
                    setSelectedSessionId(value)
                    setSelectedSemesterId("")
                    try {
                      const nextSemesters = await loadSemesters(value)
                      setSemesters(nextSemesters)
                      setSelectedSemesterId(nextSemesters[0]?.id || "")
                    } catch (e) {
                      const message = e instanceof Error ? e.message : "Failed to load semesters"
                      toast({ title: "Error", description: message, variant: "destructive" })
                      setSemesters([])
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Semester</Label>
                <Select value={selectedSemesterId} onValueChange={setSelectedSemesterId}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedSessionId ? "Select semester" : "Select session first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters
                      .filter((s) => s.sessionId === selectedSessionId)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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
                  <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                  <SelectItem value="ONLINE">Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={isProcessingPayment}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={
                isProcessingPayment ||
                !selectedAccount ||
                !paymentAmount ||
                !paymentMethod
              }
            >
              {isProcessingPayment ? "Processing..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}