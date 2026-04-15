import { NextRequest, NextResponse } from "next/server"
import { Budget, BudgetFilters, BudgetListResponse } from "@/types/finance"

// Mock budget data
const mockBudgets: Budget[] = [
  {
    id: "budget-2024-001",
    budgetName: "Academic Year 2024-2025 Operating Budget",
    budgetPeriod: "ANNUAL",
    fiscalYear: "2024-2025",
    startDate: "2024-07-01",
    endDate: "2025-06-30",
    status: "ACTIVE",
    totalBudgetAmount: 2500000.00,
    totalActualAmount: 1850000.00,
    totalVariance: -650000.00,
    variancePercentage: -26.0,
    departmentId: undefined,
    createdBy: "Budget Director",
    createdById: "usr-budget-001",
    budgetLineItems: [
      {
        id: "bli-001",
        budgetId: "budget-2024-001",
        accountId: "acc-4001",
        account: {
          id: "acc-4001",
          accountCode: "4001",
          accountName: "Tuition Revenue",
          accountType: "REVENUE",
          accountSubType: "Operating Revenue",
          isActive: true,
          balance: 1250000.00,
          description: "Revenue from student tuition fees",
          createdAt: "2024-01-01T08:00:00Z",
          updatedAt: "2024-09-26T08:00:00Z"
        },
        categoryName: "Student Revenue",
        budgetedAmount: 1800000.00,
        actualAmount: 1250000.00,
        variance: -550000.00,
        variancePercentage: -30.6,
        notes: "Lower enrollment than projected"
      },
      {
        id: "bli-002",
        budgetId: "budget-2024-001",
        accountId: "acc-4002",
        account: {
          id: "acc-4002",
          accountCode: "4002", 
          accountName: "Lab Fee Revenue",
          accountType: "REVENUE",
          accountSubType: "Operating Revenue",
          isActive: true,
          balance: 185000.00,
          description: "Revenue from lab fees",
          createdAt: "2024-01-01T08:00:00Z",
          updatedAt: "2024-09-26T08:00:00Z"
        },
        categoryName: "Student Revenue",
        budgetedAmount: 200000.00,
        actualAmount: 185000.00,
        variance: -15000.00,
        variancePercentage: -7.5,
        notes: "Slightly below target"
      },
      {
        id: "bli-003",
        budgetId: "budget-2024-001",
        accountId: "acc-5101",
        account: {
          id: "acc-5101",
          accountCode: "5101",
          accountName: "Salaries Expense",
          accountType: "EXPENSE",
          accountSubType: "Personnel Expenses",
          isActive: true,
          balance: 865000.00,
          description: "Staff salaries and wages",
          createdAt: "2024-01-01T08:00:00Z",
          updatedAt: "2024-09-26T08:00:00Z"
        },
        categoryName: "Personnel Costs",
        budgetedAmount: -900000.00,
        actualAmount: -865000.00,
        variance: 35000.00,
        variancePercentage: 3.9,
        notes: "Under budget due to vacant positions"
      },
      {
        id: "bli-004",
        budgetId: "budget-2024-001",
        accountId: "acc-5102",
        account: {
          id: "acc-5102",
          accountCode: "5102",
          accountName: "Benefits Expense",
          accountType: "EXPENSE",
          accountSubType: "Personnel Expenses",
          isActive: true,
          balance: 125000.00,
          description: "Employee benefits and insurance",
          createdAt: "2024-01-01T08:00:00Z",
          updatedAt: "2024-09-26T08:00:00Z"
        },
        categoryName: "Personnel Costs",
        budgetedAmount: -180000.00,
        actualAmount: -125000.00,
        variance: 55000.00,
        variancePercentage: 30.6,
        notes: "Lower benefits utilization"
      },
      {
        id: "bli-005",
        budgetId: "budget-2024-001",
        accountId: "acc-5001",
        account: {
          id: "acc-5001",
          accountCode: "5001",
          accountName: "Office Supplies Expense",
          accountType: "EXPENSE",
          accountSubType: "Operating Expenses",
          isActive: true,
          balance: 25400.00,
          description: "Office supplies and stationery",
          createdAt: "2024-01-01T08:00:00Z",
          updatedAt: "2024-09-26T08:00:00Z"
        },
        categoryName: "Operating Expenses",
        budgetedAmount: -30000.00,
        actualAmount: -25400.00,
        variance: 4600.00,
        variancePercentage: 15.3,
        notes: "Cost control measures effective"
      }
    ],
    createdAt: "2024-06-01T08:00:00Z",
    updatedAt: "2024-09-26T10:00:00Z"
  },
  {
    id: "budget-2024-002",
    budgetName: "IT Department Budget Q4 2024",
    budgetPeriod: "QUARTERLY",
    fiscalYear: "2024-2025",
    startDate: "2024-10-01",
    endDate: "2024-12-31",
    status: "DRAFT",
    totalBudgetAmount: 150000.00,
    totalActualAmount: 0.00,
    totalVariance: -150000.00,
    variancePercentage: -100.0,
    departmentId: "dept-it-001",
    createdBy: "IT Director",
    createdById: "usr-it-001",
    budgetLineItems: [
      {
        id: "bli-006",
        budgetId: "budget-2024-002",
        accountId: "acc-1200",
        account: {
          id: "acc-1200",
          accountCode: "1200",
          accountName: "Computer Equipment",
          accountType: "ASSET",
          accountSubType: "Fixed Assets",
          isActive: true,
          balance: 450000.00,
          description: "Computer hardware and equipment",
          createdAt: "2024-01-01T08:00:00Z",
          updatedAt: "2024-09-26T08:00:00Z"
        },
        categoryName: "Capital Expenditure",
        budgetedAmount: -100000.00,
        actualAmount: 0.00,
        variance: 100000.00,
        variancePercentage: 100.0,
        notes: "Equipment purchase planned for Q4"
      },
      {
        id: "bli-007",
        budgetId: "budget-2024-002",
        accountId: "acc-5002",
        account: {
          id: "acc-5002",
          accountCode: "5002",
          accountName: "Software Expense",
          accountType: "EXPENSE",
          accountSubType: "Operating Expenses",
          isActive: true,
          balance: 18900.00,
          description: "Software licenses and subscriptions",
          createdAt: "2024-01-01T08:00:00Z",
          updatedAt: "2024-09-26T08:00:00Z"
        },
        categoryName: "Software & Licenses",
        budgetedAmount: -50000.00,
        actualAmount: 0.00,
        variance: 50000.00,
        variancePercentage: 100.0,
        notes: "Software renewals scheduled for November"
      }
    ],
    createdAt: "2024-09-15T08:00:00Z",
    updatedAt: "2024-09-26T10:00:00Z"
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const filters: BudgetFilters = {
      fiscalYear: searchParams.get("fiscalYear") || undefined,
      budgetPeriod: searchParams.get("budgetPeriod") || undefined,
      status: searchParams.get("status") || undefined,
      departmentId: searchParams.get("departmentId") || undefined,
      search: searchParams.get("search") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "10")
    }

    // Filter budgets based on filters
    let filteredBudgets = mockBudgets

    if (filters.fiscalYear) {
      filteredBudgets = filteredBudgets.filter(budget => 
        budget.fiscalYear === filters.fiscalYear
      )
    }

    if (filters.budgetPeriod) {
      filteredBudgets = filteredBudgets.filter(budget => 
        budget.budgetPeriod === filters.budgetPeriod
      )
    }

    if (filters.status) {
      filteredBudgets = filteredBudgets.filter(budget => 
        budget.status === filters.status
      )
    }

    if (filters.departmentId) {
      filteredBudgets = filteredBudgets.filter(budget => 
        budget.departmentId === filters.departmentId
      )
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filteredBudgets = filteredBudgets.filter(budget => 
        budget.budgetName.toLowerCase().includes(searchTerm) ||
        budget.fiscalYear.toLowerCase().includes(searchTerm)
      )
    }

    // Sort by creation date (newest first)
    filteredBudgets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Pagination
    const page = filters.page || 1
    const limit = filters.limit || 10
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit

    const paginatedBudgets = filteredBudgets.slice(startIndex, endIndex)

    const response: BudgetListResponse = {
      budgets: paginatedBudgets,
      pagination: {
        page,
        limit,
        total: filteredBudgets.length,
        totalPages: Math.ceil(filteredBudgets.length / limit)
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching budgets:", error)
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const budgetData = await request.json()
    
    // In a real application, this would:
    // 1. Validate budget data
    // 2. Check for overlapping budget periods
    // 3. Create budget record with line items
    // 4. Initialize budget tracking
    
    console.log("Creating new budget:", budgetData)
    
    const newBudget = {
      id: `budget-${Date.now()}`,
      budgetName: budgetData.budgetName,
      budgetPeriod: budgetData.budgetPeriod,
      fiscalYear: budgetData.fiscalYear,
      startDate: budgetData.startDate,
      endDate: budgetData.endDate,
      status: "DRAFT",
      totalBudgetAmount: budgetData.totalBudgetAmount || 0,
      totalActualAmount: 0,
      totalVariance: -(budgetData.totalBudgetAmount || 0),
      variancePercentage: -100.0,
      departmentId: budgetData.departmentId,
      budgetLineItems: budgetData.budgetLineItems || [],
      createdBy: budgetData.createdBy || "Budget Manager",
      createdById: budgetData.createdById || "usr-budget-001",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    return NextResponse.json(newBudget, { status: 201 })
  } catch (error) {
    console.error("Error creating budget:", error)
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    )
  }
}