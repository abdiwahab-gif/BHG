"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useFieldArray } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Minus, 
  Save, 
  Send, 
  Building2, 
  Package, 
  DollarSign,
  Calendar,
  AlertTriangle
} from "lucide-react"
import { useCreateRequisition } from "@/hooks/use-procurement"
import { CreateRequisitionRequest, ProcurementItem } from "@/types/procurement"
import { toast } from "@/hooks/use-toast"

interface FormData extends Omit<CreateRequisitionRequest, 'items'> {
  items: (Omit<ProcurementItem, 'id'> & { tempId: string })[]
}

const departments = [
  "Computer Science",
  "Engineering", 
  "Business Administration",
  "Medicine",
  "Arts & Literature",
  "Physics",
  "Chemistry",
  "Mathematics",
  "Library",
  "Administration",
  "Finance",
  "Human Resources",
  "Maintenance",
  "Security"
]

const itemCategories = [
  "Office Supplies",
  "Computer & IT Equipment", 
  "Laboratory Equipment",
  "Furniture",
  "Stationery",
  "Books & Publications",
  "Maintenance Supplies",
  "Medical Supplies",
  "Cleaning Supplies",
  "Other"
]

export function CreateRequisitionForm() {
  const router = useRouter()
  const createMutation = useCreateRequisition()
  
  const [formData, setFormData] = useState<FormData>({
    requestingDepartment: "",
    items: [{
      tempId: "1",
      name: "",
      category: "",
      description: "",
      quantity: 1,
      estimatedUnitPrice: 0,
      estimatedTotalPrice: 0,
      specifications: "",
      urgency: "medium"
    }],
    justification: "",
    priority: "medium",
    budgetCode: "",
    expectedDeliveryDate: ""
  })

  const [submitType, setSubmitType] = useState<'draft' | 'submit'>('submit')

  const addItem = () => {
    const newItem = {
      tempId: Date.now().toString(),
      name: "",
      category: "",
      description: "",
      quantity: 1,
      estimatedUnitPrice: 0,
      estimatedTotalPrice: 0,
      specifications: "",
      urgency: "medium" as const
    }
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
  }

  const removeItem = (tempId: string) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.tempId !== tempId)
      }))
    }
  }

  const updateItem = (tempId: string, field: keyof Omit<ProcurementItem, 'id'>, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.tempId === tempId) {
          const updatedItem = { ...item, [field]: value }
          
          // Auto-calculate total price when quantity or unit price changes
          if (field === 'quantity' || field === 'estimatedUnitPrice') {
            updatedItem.estimatedTotalPrice = updatedItem.quantity * updatedItem.estimatedUnitPrice
          }
          
          return updatedItem
        }
        return item
      })
    }))
  }

  const updateFormField = (field: keyof Omit<FormData, 'items'>, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const calculateTotalAmount = () => {
    return formData.items.reduce((total, item) => total + item.estimatedTotalPrice, 0)
  }

  const handleSubmit = async (type: 'draft' | 'submit') => {
    // Validation
    if (!formData.requestingDepartment) {
      toast({
        title: "Error",
        description: "Please select a requesting department",
        variant: "destructive"
      })
      return
    }

    if (formData.items.some(item => !item.name || !item.category || item.quantity <= 0)) {
      toast({
        title: "Error", 
        description: "Please fill in all required item fields",
        variant: "destructive"
      })
      return
    }

    if (!formData.justification.trim()) {
      toast({
        title: "Error",
        description: "Please provide justification for this requisition",
        variant: "destructive"
      })
      return
    }

    try {
      const requestData: CreateRequisitionRequest = {
        ...formData,
        items: formData.items.map(({ tempId, ...item }) => item)
      }

      await createMutation.mutateAsync(requestData)
      
      toast({
        title: "Success",
        description: type === 'draft' 
          ? "Requisition saved as draft" 
          : "Requisition submitted successfully"
      })
      
      router.push('/procurement')
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create requisition. Please try again.",
        variant: "destructive"
      })
    }
  }

  const totalAmount = calculateTotalAmount()

  return (
    <form className="space-y-6">
      {/* Basic Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="department" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Requesting Department *
          </Label>
          <Select
            value={formData.requestingDepartment}
            onValueChange={(value) => updateFormField('requestingDepartment', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Priority
          </Label>
          <Select
            value={formData.priority}
            onValueChange={(value: any) => updateFormField('priority', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="budgetCode">Budget Code</Label>
          <Input
            id="budgetCode"
            value={formData.budgetCode}
            onChange={(e) => updateFormField('budgetCode', e.target.value)}
            placeholder="e.g., DEPT-2024-001"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expectedDelivery" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Expected Delivery Date
          </Label>
          <Input
            id="expectedDelivery"
            type="date"
            value={formData.expectedDeliveryDate}
            onChange={(e) => updateFormField('expectedDeliveryDate', e.target.value)}
          />
        </div>
      </div>

      {/* Items Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Requested Items
          </CardTitle>
          <Button type="button" onClick={addItem} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <Card key={item.tempId} className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="secondary">Item {index + 1}</Badge>
                  {formData.items.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeItem(item.tempId)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Item Name *</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(item.tempId, 'name', e.target.value)}
                      placeholder="Enter item name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={item.category}
                      onValueChange={(value) => updateItem(item.tempId, 'category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemCategories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.tempId, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Estimated Unit Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.estimatedUnitPrice}
                        onChange={(e) => updateItem(item.tempId, 'estimatedUnitPrice', parseFloat(e.target.value) || 0)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={item.description}
                      onChange={(e) => updateItem(item.tempId, 'description', e.target.value)}
                      placeholder="Brief description of the item"
                      rows={2}
                    />
                  </div>
                  
                  <div className="md:col-span-2 space-y-2">
                    <Label>Specifications</Label>
                    <Textarea
                      value={item.specifications}
                      onChange={(e) => updateItem(item.tempId, 'specifications', e.target.value)}
                      placeholder="Technical specifications, brand preferences, etc."
                      rows={2}
                    />
                  </div>
                  
                  <div className="md:col-span-2 flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-gray-500">
                      Total Price: ${item.estimatedTotalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          {/* Total Amount */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Total Estimated Amount:</span>
              <span className="text-2xl font-bold text-amber-600">
                ${totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Justification */}
      <div className="space-y-2">
        <Label htmlFor="justification">Justification *</Label>
        <Textarea
          id="justification"
          value={formData.justification}
          onChange={(e) => updateFormField('justification', e.target.value)}
          placeholder="Please provide a detailed justification for this procurement request..."
          rows={4}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/procurement')}
        >
          Cancel
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSubmit('draft')}
          disabled={createMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          Save as Draft
        </Button>
        
        <Button
          type="button"
          onClick={() => handleSubmit('submit')}
          disabled={createMutation.isPending}
          className="bg-amber-500 hover:bg-amber-600"
        >
          <Send className="h-4 w-4 mr-2" />
          {createMutation.isPending ? "Submitting..." : "Submit Requisition"}
        </Button>
      </div>
    </form>
  )
}