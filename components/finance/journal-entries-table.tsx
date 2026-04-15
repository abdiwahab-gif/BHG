"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Search, Filter, FileText, Calendar, ChevronDown, ChevronRight, Plus, Eye } from "lucide-react"
import { JournalEntry, JournalEntryFilters } from "@/types/finance"
import { NewJournalEntryForm } from "./new-journal-entry-form"

export function JournalEntriesTable() {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<JournalEntryFilters>({
    page: 1,
    limit: 10
  })
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)

  useEffect(() => {
    fetchJournalEntries()
  }, [filters])

  const fetchJournalEntries = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/finance/journal?${queryParams}`)
      const data = await response.json()
      setJournalEntries(data.journalEntries || [])
    } catch (error) {
      console.error('Error fetching journal entries:', error)
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
      DRAFT: "bg-yellow-100 text-yellow-800",
      POSTED: "bg-amber-100 text-amber-800",
      REVERSED: "bg-red-100 text-red-800"
    }
    return statusStyles[status as keyof typeof statusStyles] || "bg-gray-100 text-gray-800"
  }

  const getEntryTypeBadge = (type: string) => {
    const typeStyles = {
      GENERAL: "bg-blue-100 text-blue-800",
      STUDENT_FEE: "bg-amber-100 text-amber-800",
      PAYROLL: "bg-purple-100 text-purple-800",
      BILL: "bg-orange-100 text-orange-800",
      PAYMENT: "bg-teal-100 text-teal-800",
      ADJUSTING: "bg-gray-100 text-gray-800",
      CLOSING: "bg-red-100 text-red-800"
    }
    return typeStyles[type as keyof typeof typeStyles] || "bg-gray-100 text-gray-800"
  }

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries)
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId)
    } else {
      newExpanded.add(entryId)
    }
    setExpandedEntries(newExpanded)
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
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Entry number or description..."
                  className="pl-10"
                  value={filters.search || ""}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="entryType">Entry Type</Label>
              <Select
                value={filters.entryType || "all"}
                onValueChange={(value) => setFilters({ ...filters, entryType: value === "all" ? undefined : value, page: 1 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="STUDENT_FEE">Student Fee</SelectItem>
                  <SelectItem value="PAYROLL">Payroll</SelectItem>
                  <SelectItem value="BILL">Bill</SelectItem>
                  <SelectItem value="PAYMENT">Payment</SelectItem>
                  <SelectItem value="ADJUSTING">Adjusting</SelectItem>
                  <SelectItem value="CLOSING">Closing</SelectItem>
                </SelectContent>
              </Select>
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
                  <SelectItem value="POSTED">Posted</SelectItem>
                  <SelectItem value="REVERSED">Reversed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined, page: 1 })}
              />
            </div>

            <div className="flex items-end">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    New Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Create New Journal Entry</DialogTitle>
                    <DialogDescription>
                      Add a new journal entry with debit and credit line items.
                    </DialogDescription>
                  </DialogHeader>
                  <NewJournalEntryForm onSuccess={() => {
                    fetchJournalEntries()
                  }} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Journal Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Journal Entries
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
            <div className="space-y-4">
              {journalEntries.map((entry) => (
                <Card key={entry.id} className="overflow-hidden">
                  <Collapsible>
                    <CollapsibleTrigger
                      className="w-full"
                      onClick={() => toggleExpanded(entry.id)}
                    >
                      <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          {expandedEntries.has(entry.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{entry.entryNumber}</span>
                              <Badge className={getEntryTypeBadge(entry.entryType)}>
                                {entry.entryType}
                              </Badge>
                              <Badge className={getStatusBadge(entry.status)}>
                                {entry.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {entry.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {new Date(entry.entryDate).toLocaleDateString()}
                          </div>
                          <div className="text-lg font-medium mt-1">
                            {formatCurrency(entry.totalDebit)}
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="px-4 pb-4 border-t bg-gray-50">
                        <div className="mt-4">
                          <h4 className="font-medium mb-3">Journal Entry Line Items</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Account</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Debit</TableHead>
                                <TableHead className="text-right">Credit</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {entry.lineItems.map((lineItem) => (
                                <TableRow key={lineItem.id}>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">
                                        {lineItem.account.accountCode} - {lineItem.account.accountName}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {lineItem.account.accountType}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell>{lineItem.description}</TableCell>
                                  <TableCell className="text-right">
                                    {lineItem.debitAmount > 0 ? (
                                      <span className="font-medium text-blue-600">
                                        {formatCurrency(lineItem.debitAmount)}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {lineItem.creditAmount > 0 ? (
                                      <span className="font-medium text-amber-600">
                                        {formatCurrency(lineItem.creditAmount)}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="border-t-2 font-medium">
                                <TableCell colSpan={2}>Totals:</TableCell>
                                <TableCell className="text-right text-blue-600">
                                  {formatCurrency(entry.totalDebit)}
                                </TableCell>
                                <TableCell className="text-right text-amber-600">
                                  {formatCurrency(entry.totalCredit)}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                          
                          <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
                            <div>
                              Created by {entry.createdBy} on {new Date(entry.createdAt).toLocaleString()}
                            </div>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedEntry(entry)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View Details
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl">
                                  <DialogHeader>
                                    <DialogTitle>Journal Entry Details</DialogTitle>
                                    <DialogDescription>
                                      {entry.entryNumber} - {entry.description}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Entry Number</Label>
                                        <p className="font-medium">{entry.entryNumber}</p>
                                      </div>
                                      <div>
                                        <Label>Entry Date</Label>
                                        <p>{new Date(entry.entryDate).toLocaleDateString()}</p>
                                      </div>
                                      <div>
                                        <Label>Type</Label>
                                        <Badge className={getEntryTypeBadge(entry.entryType)}>
                                          {entry.entryType}
                                        </Badge>
                                      </div>
                                      <div>
                                        <Label>Status</Label>
                                        <Badge className={getStatusBadge(entry.status)}>
                                          {entry.status}
                                        </Badge>
                                      </div>
                                      <div className="col-span-2">
                                        <Label>Description</Label>
                                        <p>{entry.description}</p>
                                      </div>
                                      {entry.reference && (
                                        <div className="col-span-2">
                                          <Label>Reference</Label>
                                          <p>{entry.reference}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}