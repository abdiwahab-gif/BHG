import { NextRequest, NextResponse } from 'next/server'
import type { PayrollRecord, PayrollResponse, CreatePayrollRequest, PayrollComponent, TaxDeduction } from '@/types/hr'

// Mock payroll records data
const mockPayrollRecords: PayrollRecord[] = [
  {
    id: "pay001",
    employeeId: "emp001",
    payPeriodStart: "2024-09-01",
    payPeriodEnd: "2024-09-30",
    payDate: "2024-10-05",
    status: "paid",
    baseSalary: 5000,
    overtimePay: 200,
    bonuses: [
      {
        type: "performance",
        description: "Quarterly performance bonus",
        amount: 500,
        isRecurring: false,
        taxable: true
      }
    ],
    deductions: [
      {
        type: "insurance",
        description: "Health insurance",
        amount: 150,
        isRecurring: true,
        taxable: false
      },
      {
        type: "other",
        description: "Union dues",
        amount: 50,
        isRecurring: true,
        taxable: false
      }
    ],
    benefits: [
      {
        type: "housing",
        description: "Housing allowance",
        amount: 1000,
        isRecurring: true,
        taxable: true
      },
      {
        type: "transport",
        description: "Transportation allowance",
        amount: 500,
        isRecurring: true,
        taxable: true
      }
    ],
    taxes: [
      {
        type: "income",
        description: "Federal income tax",
        rate: 0.15,
        amount: 800,
        category: "federal"
      },
      {
        type: "social_security",
        description: "Social Security",
        rate: 0.062,
        amount: 300,
        category: "federal"
      }
    ],
    grossPay: 7200,
    netPay: 5900,
    payslipGenerated: true,
    createdAt: "2024-09-01T00:00:00Z"
  },
  {
    id: "pay002",
    employeeId: "emp002",
    payPeriodStart: "2024-09-01",
    payPeriodEnd: "2024-09-30",
    payDate: "2024-10-05",
    status: "paid",
    baseSalary: 4500,
    overtimePay: 0,
    bonuses: [],
    deductions: [
      {
        type: "insurance",
        description: "Health insurance",
        amount: 150,
        isRecurring: true,
        taxable: false
      }
    ],
    benefits: [
      {
        type: "housing",
        description: "Housing allowance",
        amount: 900,
        isRecurring: true,
        taxable: true
      },
      {
        type: "transport",
        description: "Transportation allowance",
        amount: 400,
        isRecurring: true,
        taxable: true
      }
    ],
    taxes: [
      {
        type: "income",
        description: "Federal income tax",
        rate: 0.15,
        amount: 720,
        category: "federal"
      },
      {
        type: "social_security",
        description: "Social Security",
        rate: 0.062,
        amount: 270,
        category: "federal"
      }
    ],
    grossPay: 5800,
    netPay: 4660,
    payslipGenerated: true,
    createdAt: "2024-09-01T00:00:00Z"
  },
  {
    id: "pay003",
    employeeId: "emp003",
    payPeriodStart: "2024-09-01",
    payPeriodEnd: "2024-09-30",
    payDate: "2024-10-05",
    status: "approved",
    baseSalary: 3800,
    overtimePay: 76,
    bonuses: [],
    deductions: [
      {
        type: "insurance",
        description: "Health insurance",
        amount: 100,
        isRecurring: true,
        taxable: false
      },
      {
        type: "other",
        description: "Miscellaneous",
        amount: 25,
        isRecurring: false,
        taxable: false
      }
    ],
    benefits: [
      {
        type: "housing",
        description: "Housing allowance",
        amount: 500,
        isRecurring: true,
        taxable: true
      },
      {
        type: "transport",
        description: "Transportation allowance",
        amount: 300,
        isRecurring: true,
        taxable: true
      }
    ],
    taxes: [
      {
        type: "income",
        description: "Federal income tax",
        rate: 0.15,
        amount: 570,
        category: "federal"
      },
      {
        type: "social_security",
        description: "Social Security",
        rate: 0.062,
        amount: 228,
        category: "federal"
      }
    ],
    grossPay: 4676,
    netPay: 3753,
    payslipGenerated: false,
    createdAt: "2024-09-01T00:00:00Z"
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const employeeId = searchParams.get('employeeId') || ''
    const department = searchParams.get('department') || ''
    const status = searchParams.get('status') || ''
    const payPeriod = searchParams.get('payPeriod') || ''

    let filteredPayrolls = mockPayrollRecords

    // Apply filters
    if (employeeId) {
      filteredPayrolls = filteredPayrolls.filter(payroll => payroll.employeeId === employeeId)
    }

    if (status && status !== 'all') {
      filteredPayrolls = filteredPayrolls.filter(payroll => payroll.status === status)
    }

    if (payPeriod) {
      filteredPayrolls = filteredPayrolls.filter(payroll => 
        payroll.payPeriodStart.includes(payPeriod) || payroll.payPeriodEnd.includes(payPeriod)
      )
    }

    // Calculate pagination
    const total = filteredPayrolls.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedPayrolls = filteredPayrolls.slice(startIndex, endIndex)

    const response: PayrollResponse = {
      payrolls: paginatedPayrolls,
      total,
      page,
      limit,
      totalPages
    }

    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('Error fetching payroll records:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch payroll records' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const payrollData: CreatePayrollRequest = await request.json()
    
    if (!payrollData.employeeId || !payrollData.payPeriodStart || !payrollData.payPeriodEnd || !payrollData.baseSalary) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Employee ID, pay period dates, and base salary are required' 
        },
        { status: 400 }
      )
    }

    // Calculate gross and net pay
    const benefitsTotal = payrollData.benefits?.reduce((sum, benefit) => sum + benefit.amount, 0) || 0
    const bonusesTotal = payrollData.bonuses?.reduce((sum, bonus) => sum + bonus.amount, 0) || 0
    const grossPay = payrollData.baseSalary + benefitsTotal + bonusesTotal

    const deductionsTotal = payrollData.deductions?.reduce((sum, deduction) => sum + deduction.amount, 0) || 0
    
    // Calculate basic taxes (15% income tax, 6.2% social security)
    const incomeTax = grossPay * 0.15
    const socialSecurityTax = grossPay * 0.062
    const totalTaxes = incomeTax + socialSecurityTax
    
    const netPay = grossPay - deductionsTotal - totalTaxes

    const newPayrollRecord: PayrollRecord = {
      id: `pay${(mockPayrollRecords.length + 1).toString().padStart(3, '0')}`,
      employeeId: payrollData.employeeId,
      payPeriodStart: payrollData.payPeriodStart,
      payPeriodEnd: payrollData.payPeriodEnd,
      payDate: new Date().toISOString().split('T')[0],
      baseSalary: payrollData.baseSalary,
      overtimePay: 0,
      bonuses: payrollData.bonuses || [],
      deductions: payrollData.deductions || [],
      benefits: payrollData.benefits || [],
      taxes: [
        {
          type: "income",
          description: "Federal income tax",
          rate: 0.15,
          amount: incomeTax,
          category: "federal"
        },
        {
          type: "social_security",
          description: "Social Security",
          rate: 0.062,
          amount: socialSecurityTax,
          category: "federal"
        }
      ],
      grossPay,
      netPay,
      status: "draft",
      payslipGenerated: false,
      createdAt: new Date().toISOString()
    }

    mockPayrollRecords.push(newPayrollRecord)

    return NextResponse.json({
      success: true,
      data: newPayrollRecord,
      message: 'Payroll record created successfully'
    })
  } catch (error) {
    console.error('Error creating payroll record:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create payroll record' 
      },
      { status: 500 }
    )
  }
}