"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DialogFooter } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Plus } from "lucide-react"
import { ChartOfAccounts } from "@/types/finance"

interface NewJournalEntryFormProps {
  onSuccess: () => void
}

interface LineItem {
  id: string
  accountId: string
  accountName: string
  description: string
  debitAmount: number
  creditAmount: number
}

export function NewJournalEntryForm({ onSuccess }: NewJournalEntryFormProps) {
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<ChartOfAccounts[]>([])
  const [formData, setFormData] = useState({
    description: "",
    reference: "",
    entryDate: new Date().toISOString().split('T')[0],
    entryType: "GENERAL"
  })
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', accountId: '', accountName: '', description: '', debitAmount: 0, creditAmount: 0 },
    { id: '2', accountId: '', accountName: '', description: '', debitAmount: 0, creditAmount: 0 }
  ])
  const { toast } = useToast()

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/finance/chart-of-accounts')
      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const addLineItem = () => {
    const newId = (lineItems.length + 1).toString()
    setLineItems([...lineItems, {
      id: newId,
      accountId: '',
      accountName: '',
      description: '',
      debitAmount: 0,
      creditAmount: 0
    }])
  }

  const removeLineItem = (id: string) => {
    if (lineItems.length > 2) {
      setLineItems(lineItems.filter(item => item.id !== id))
    }
  }

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }
        
        // If account is changed, update account name
        if (field === 'accountId') {
          const account = accounts.find(acc => acc.id === value)
          updatedItem.accountName = account?.accountName || ''
        }
        
        return updatedItem
      }
      return item
    }))
  }

  const getTotalDebits = () => {
    return lineItems.reduce((sum, item) => sum + item.debitAmount, 0)
  }

  const getTotalCredits = () => {
    return lineItems.reduce((sum, item) => sum + item.creditAmount, 0)
  }

  const isBalanced = () => {
    return Math.abs(getTotalDebits() - getTotalCredits()) < 0.01
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isBalanced()) {
      toast({
        title: "Error",
        description: "Journal entry must be balanced (total debits = total credits)",
        variant: "destructive",
      })
      return
    }

    if (lineItems.some(item => !item.accountId || !item.description)) {
      toast({
        title: "Error",
        description: "All line items must have an account and description",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const entryData = {
        ...formData,
        totalDebit: getTotalDebits(),
        totalCredit: getTotalCredits(),
        lineItems: lineItems.map(item => ({
          accountId: item.accountId,
          description: item.description,
          debitAmount: item.debitAmount,
          creditAmount: item.creditAmount
        }))
      }

      const response = await fetch('/api/finance/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entryData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Journal entry created successfully",
        })
        onSuccess()
      } else {
        throw new Error('Failed to create journal entry')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create journal entry",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="entryDate">Entry Date *</Label>
          <Input
            id="entryDate"
            type="date"
            value={formData.entryDate}
            onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="entryType">Entry Type</Label>
          <Select onValueChange={(value) => setFormData({ ...formData, entryType: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GENERAL">General</SelectItem>
              <SelectItem value="ADJUSTING">Adjusting</SelectItem>
              <SelectItem value="CLOSING">Closing</SelectItem>
              <SelectItem value="STUDENT_FEE">Student Fee</SelectItem>
              <SelectItem value="PAYROLL">Payroll</SelectItem>
              <SelectItem value="BILL">Bill</SelectItem>
              <SelectItem value="PAYMENT">Payment</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reference">Reference</Label>
        <Input
          id="reference"
          value={formData.reference}
          onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Line Items
            <Button type="button" onClick={addLineItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Select 
                        onValueChange={(value) => updateLineItem(item.id, 'accountId', value)}
                        value={item.accountId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.accountCode} - {account.accountName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        placeholder="Description"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.debitAmount || ''}
                        onChange={(e) => updateLineItem(item.id, 'debitAmount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.creditAmount || ''}
                        onChange={(e) => updateLineItem(item.id, 'creditAmount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <div className="flex gap-4">
              <div>Total Debits: <span className="font-bold">${getTotalDebits().toFixed(2)}</span></div>
              <div>Total Credits: <span className="font-bold">${getTotalCredits().toFixed(2)}</span></div>
            </div>
            <div className={`font-bold ${isBalanced() ? 'text-amber-600' : 'text-red-600'}`}>
              {isBalanced() ? 'Balanced ✓' : 'Out of Balance ✗'}
            </div>
          </div>
        </CardContent>
      </Card>

      <DialogFooter>
        <Button type="submit" disabled={loading || !isBalanced()}>
          {loading ? "Creating..." : "Create Entry"}
        </Button>
      </DialogFooter>
    </form>
  )
}