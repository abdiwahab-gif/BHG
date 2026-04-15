'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { useEmployees } from '@/hooks/use-hr'
import type { CreateEmployeeRequest } from '@/types/hr'

interface AddEmployeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEmployeeCreated: (employee: any) => void
}

export function AddEmployeeDialog({ open, onOpenChange, onEmployeeCreated }: AddEmployeeDialogProps) {
  const { createEmployee, loading } = useEmployees()
  
  const [formData, setFormData] = useState<Partial<CreateEmployeeRequest>>({
    firstName: '',
    lastName: '',
    email: '',
    biometricUserId: '',
    phone: '',
    dateOfBirth: '',
    gender: 'male',
    maritalStatus: 'single',
    nationality: '',
    position: '',
    department: '',
    employeeType: 'full-time',
    employmentStatus: 'active',
    hireDate: '',
    salary: 0,
    salaryType: 'monthly',
    currency: 'USD',
    payGrade: '',
    workLocation: '',
    timezone: 'UTC'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.position) {
      return
    }

    const employee = await createEmployee(formData as CreateEmployeeRequest)
    if (employee) {
      onEmployeeCreated(employee)
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        biometricUserId: '',
        phone: '',
        dateOfBirth: '',
        gender: 'male',
        maritalStatus: 'single',
        nationality: '',
        position: '',
        department: '',
        employeeType: 'full-time',
        employmentStatus: 'active',
        hireDate: '',
        salary: 0,
        salaryType: 'monthly',
        currency: 'USD',
        payGrade: '',
        workLocation: '',
        timezone: 'UTC'
      })
    }
  }

  const updateFormData = (field: keyof CreateEmployeeRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName || ''}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName || ''}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth || ''}
                  onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => updateFormData('gender', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maritalStatus">Marital Status</Label>
                <Select value={formData.maritalStatus} onValueChange={(value) => updateFormData('maritalStatus', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  value={formData.nationality || ''}
                  onChange={(e) => updateFormData('nationality', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Employment Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="biometricUserId">Biometric User ID (PIN)</Label>
                <Input
                  id="biometricUserId"
                  placeholder="e.g. 1001"
                  value={(formData as any).biometricUserId || ''}
                  onChange={(e) => updateFormData('biometricUserId' as any, e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Must match the PIN/User ID used on the fingerprint device.
                </p>
              </div>
              <div />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="position">Position *</Label>
                <Input
                  id="position"
                  value={formData.position || ''}
                  onChange={(e) => updateFormData('position', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Select value={formData.department} onValueChange={(value) => updateFormData('department', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="hr">Human Resources</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employeeType">Employee Type</Label>
                <Select value={formData.employeeType} onValueChange={(value) => updateFormData('employeeType', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="hireDate">Hire Date</Label>
                <Input
                  id="hireDate"
                  type="date"
                  value={formData.hireDate || ''}
                  onChange={(e) => updateFormData('hireDate', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="salary">Salary</Label>
                <Input
                  id="salary"
                  type="number"
                  value={formData.salary || ''}
                  onChange={(e) => updateFormData('salary', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="salaryType">Salary Type</Label>
                <Select value={formData.salaryType} onValueChange={(value) => updateFormData('salaryType', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={formData.currency} onValueChange={(value) => updateFormData('currency', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payGrade">Pay Grade</Label>
                <Input
                  id="payGrade"
                  value={formData.payGrade || ''}
                  onChange={(e) => updateFormData('payGrade', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="workLocation">Work Location</Label>
                <Input
                  id="workLocation"
                  value={formData.workLocation || ''}
                  onChange={(e) => updateFormData('workLocation', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Employee'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}