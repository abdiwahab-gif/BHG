"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface NewBillFormProps {
  onSuccess: () => void
}

export function NewBillForm({ onSuccess }: NewBillFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    vendorName: "",
    billNumber: "",
    description: "",
    amount: "",
    dueDate: "",
    category: "",
    status: "PENDING"
  })
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/finance/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          billDate: new Date().toISOString().split('T')[0],
          reference: `BILL-${Date.now()}`
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Bill created successfully",
        })
        onSuccess()
        // Reset form
        setFormData({
          vendorName: "",
          billNumber: "",
          description: "",
          amount: "",
          dueDate: "",
          category: "",
          status: "PENDING"
        })
      } else {
        throw new Error('Failed to create bill')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create bill",
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
          <Label htmlFor="vendorName">Vendor Name *</Label>
          <Input
            id="vendorName"
            value={formData.vendorName}
            onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="billNumber">Bill Number *</Label>
          <Input
            id="billNumber"
            value={formData.billNumber}
            onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date *</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select onValueChange={(value) => setFormData({ ...formData, category: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UTILITIES">Utilities</SelectItem>
            <SelectItem value="SUPPLIES">Supplies</SelectItem>
            <SelectItem value="SERVICES">Services</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            <SelectItem value="EQUIPMENT">Equipment</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Bill"}
        </Button>
      </DialogFooter>
    </form>
  )
}