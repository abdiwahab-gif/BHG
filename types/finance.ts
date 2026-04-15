// Core Financial Entities
export interface ChartOfAccounts {
  id: string
  accountCode: string
  accountName: string
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  accountSubType: string
  parentAccountId?: string
  isActive: boolean
  balance: number
  description?: string
  taxLineMapping?: string
  createdAt: string
  updatedAt: string
}

export interface JournalEntry {
  id: string
  entryNumber: string
  entryDate: string
  description: string
  reference?: string
  totalDebit: number
  totalCredit: number
  entryType: 'GENERAL' | 'ADJUSTING' | 'CLOSING' | 'STUDENT_FEE' | 'PAYROLL' | 'BILL' | 'PAYMENT'
  status: 'DRAFT' | 'POSTED' | 'REVERSED'
  lineItems: JournalEntryLineItem[]
  createdBy: string
  createdById: string
  approvedBy?: string
  approvedById?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
}

export interface JournalItem {
  id: string
  journalEntryId: string
  accountId: string
  account: ChartOfAccounts
  description: string
  debitAmount: number
  creditAmount: number
  reference?: string
}

export interface JournalEntryLineItem {
  id: string
  journalEntryId: string
  accountId: string
  account: ChartOfAccounts
  description: string
  debitAmount: number
  creditAmount: number
  lineNumber: number
}

// Student Fee Management
export interface FeeStructure {
  id: string
  name: string
  academicYear: string
  semester: string
  program: string
  level: string
  currency: string
  totalAmount: number
  dueDate: string
  lateFeePenalty: number
  lateFeePercentage: number
  isActive: boolean
  feeComponents: FeeComponent[]
  createdAt: string
  updatedAt: string
}

export interface FeeComponent {
  id: string
  feeStructureId: string
  componentName: string
  componentType: 'TUITION' | 'REGISTRATION' | 'LAB' | 'LIBRARY' | 'SPORTS' | 'TRANSPORT' | 'HOSTEL' | 'EXAMINATION' | 'OTHER'
  amount: number
  isRequired: boolean
  accountId: string
  description?: string
}

export interface StudentAccount {
  id: string
  studentId: string
  studentName: string
  studentNumber: string
  program: string
  level: string
  academicYear: string
  semester: string
  accountBalance: number
  totalFeesDue: number
  totalPaid: number
  totalOverdue: number
  lastPaymentDate?: string
  paymentStatus: 'CURRENT' | 'OVERDUE' | 'PAID' | 'PARTIAL'
  feeStructureId: string
  feeStructure: FeeStructure
  transactions: StudentTransaction[]
  createdAt: string
  updatedAt: string
}

export interface StudentTransaction {
  id: string
  studentAccountId: string
  transactionType: 'CHARGE' | 'PAYMENT' | 'ADJUSTMENT' | 'REFUND' | 'LATE_FEE'
  amount: number
  description: string
  reference?: string
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'MOBILE_MONEY' | 'CHECK' | 'ONLINE'
  receiptNumber?: string
  bankReference?: string
  journalEntryId?: string
  processedBy: string
  processedById: string
  date: string
  academicYear: string
  semester: string
  feeComponents?: FeeComponentPayment[]
  createdAt: string
  updatedAt: string
}

export interface FeeComponentPayment {
  id: string
  transactionId: string
  feeComponentId: string
  componentName: string
  amountPaid: number
}

// Payroll Management
export interface Employee {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  position: string
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN'
  hireDate: string
  terminationDate?: string
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
  bankAccount: string
  bankName: string
  taxNumber?: string
  socialSecurityNumber?: string
  payrollProfile: PayrollProfile
  createdAt: string
  updatedAt: string
}

export interface PayrollProfile {
  id: string
  employeeId: string
  baseSalary: number
  salaryType: 'MONTHLY' | 'HOURLY' | 'ANNUAL'
  currency: string
  payFrequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'
  overtimeRate?: number
  allowances: PayrollAllowance[]
  deductions: PayrollDeduction[]
  taxExemptions?: number
  isActive: boolean
  effectiveDate: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

export interface PayrollAllowance {
  id: string
  profileId: string
  name: string
  type: 'FIXED' | 'PERCENTAGE' | 'HOURLY'
  amount: number
  accountId: string
  isTaxable: boolean
  isActive: boolean
}

export interface PayrollDeduction {
  id: string
  profileId: string
  name: string
  type: 'FIXED' | 'PERCENTAGE' | 'TAX' | 'INSURANCE' | 'LOAN'
  amount: number
  accountId: string
  isRequired: boolean
  maxAmount?: number
  isActive: boolean
}

export interface PayrollRun {
  id: string
  payrollNumber: string
  payPeriodStart: string
  payPeriodEnd: string
  payDate: string
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID' | 'CANCELLED'
  totalGrossPay: number
  totalDeductions: number
  totalNetPay: number
  employeeCount: number
  journalEntryId?: string
  processedBy: string
  processedById: string
  approvedBy?: string
  approvedById?: string
  approvedAt?: string
  payrollItems: PayrollItem[]
  createdAt: string
  updatedAt: string
}

export interface PayrollItem {
  id: string
  payrollRunId: string
  employeeId: string
  employee: Employee
  grossPay: number
  totalAllowances: number
  totalDeductions: number
  taxAmount: number
  netPay: number
  hoursWorked?: number
  overtimeHours?: number
  allowanceBreakdown: PayrollAllowanceItem[]
  deductionBreakdown: PayrollDeductionItem[]
  status: 'CALCULATED' | 'PAID' | 'CANCELLED'
}

export interface PayrollAllowanceItem {
  id: string
  payrollItemId: string
  allowanceId: string
  name: string
  amount: number
}

export interface PayrollDeductionItem {
  id: string
  payrollItemId: string
  deductionId: string
  name: string
  amount: number
}

// General Financial Management
export interface Vendor {
  id: string
  vendorNumber: string
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
  taxNumber?: string
  paymentTerms: string
  accountPayableId: string
  isActive: boolean
  totalOwed: number
  creditLimit?: number
  createdAt: string
  updatedAt: string
}

export interface Bill {
  id: string
  billNumber: string
  vendorId: string
  vendor: Vendor
  billDate: string
  dueDate: string
  description: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  amountPaid: number
  amountDue: number
  status: 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  reference?: string
  journalEntryId?: string
  billItems: BillItem[]
  payments: BillPayment[]
  createdBy: string
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface BillItem {
  id: string
  billId: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  accountId: string
  account: ChartOfAccounts
}

export interface BillPayment {
  id: string
  billId: string
  paymentDate: string
  amount: number
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'CREDIT_CARD'
  reference?: string
  journalEntryId?: string
  createdBy: string
  createdById: string
  createdAt: string
}

export interface Budget {
  id: string
  budgetName: string
  budgetPeriod: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'
  fiscalYear: string
  startDate: string
  endDate: string
  status: 'DRAFT' | 'APPROVED' | 'ACTIVE' | 'CLOSED'
  totalBudgetAmount: number
  totalActualAmount: number
  totalVariance: number
  variancePercentage: number
  departmentId?: string
  budgetLineItems: BudgetLineItem[]
  createdBy: string
  createdById: string
  approvedBy?: string
  approvedById?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
}

export interface BudgetItem {
  id: string
  budgetId: string
  accountId: string
  account: ChartOfAccounts
  budgetedAmount: number
  actualAmount: number
  variance: number
  percentageUsed: number
  quarter1: number
  quarter2: number
  quarter3: number
  quarter4: number
}

export interface BudgetLineItem {
  id: string
  budgetId: string
  accountId: string
  account: ChartOfAccounts
  categoryName: string
  budgetedAmount: number
  actualAmount: number
  variance: number
  variancePercentage: number
  notes?: string
}

// Financial Reports
export interface FinancialReportConfig {
  id: string
  reportName: string
  reportType: 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'CASH_FLOW' | 'TRIAL_BALANCE' | 'AGING_REPORT' | 'BUDGET_VARIANCE'
  fiscalYear: string
  startDate: string
  endDate: string
  includeInactive: boolean
  groupBy: 'ACCOUNT_TYPE' | 'DEPARTMENT' | 'CATEGORY'
  filters: ReportFilter[]
  createdBy: string
  createdAt: string
}

export interface ReportFilter {
  field: string
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS'
  value: string
}

export interface BalanceSheetReport {
  reportDate: string
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  assets: AccountGroup[]
  liabilities: AccountGroup[]
  equity: AccountGroup[]
}

export interface IncomeStatementReport {
  startDate: string
  endDate: string
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  grossProfit: number
  operatingIncome: number
  revenue: AccountGroup[]
  expenses: AccountGroup[]
}

export interface CashFlowReport {
  startDate: string
  endDate: string
  operatingCashFlow: number
  investingCashFlow: number
  financingCashFlow: number
  netCashFlow: number
  beginningCash: number
  endingCash: number
  operatingActivities: CashFlowItem[]
  investingActivities: CashFlowItem[]
  financingActivities: CashFlowItem[]
}

export interface AccountGroup {
  groupName: string
  totalAmount: number
  accounts: AccountBalance[]
}

export interface AccountBalance {
  accountId: string
  accountCode: string
  accountName: string
  balance: number
  percentage: number
}

export interface CashFlowItem {
  description: string
  amount: number
  accountId: string
}

// Filter and Search Types
export interface StudentAccountFilters {
  program?: string
  level?: string
  academicYear?: string
  semester?: string
  paymentStatus?: string
  search?: string
  page?: number
  limit?: number
}

export interface PayrollFilters {
  department?: string
  employmentType?: string
  status?: string
  payPeriodStart?: string
  payPeriodEnd?: string
  search?: string
  page?: number
  limit?: number
}

export interface FinancialTransactionFilters {
  accountId?: string
  transactionType?: string
  dateFrom?: string
  dateTo?: string
  amountFrom?: number
  amountTo?: number
  search?: string
  page?: number
  limit?: number
}

export interface BillFilters {
  vendorId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  overdue?: boolean
  search?: string
  page?: number
  limit?: number
}

// API Response Types
export interface StudentAccountListResponse {
  studentAccounts: StudentAccount[]
  meta?: {
    studentsTable?: string
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface PayrollListResponse {
  payrollRuns: PayrollRun[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface BillListResponse {
  bills: Bill[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface FinancialDashboardStats {
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  cashBalance: number
  accountsReceivable: number
  accountsPayable: number
  studentFeesOwed: number
  payrollLiability: number
  monthlyRevenueTrend: { month: string; amount: number }[]
  expenseBreakdown: { category: string; amount: number; percentage: number }[]
  topPayingStudents: { studentName: string; amountPaid: number }[]
  overdueAccounts: { studentName: string; overdueDays: number; amount: number }[]
}

// Filter and Response Types
export interface JournalEntryFilters {
  entryType?: string
  accountId?: string
  dateFrom?: string
  dateTo?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}

export interface JournalEntryListResponse {
  journalEntries: JournalEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface AccountFilters {
  accountType?: string
  accountSubType?: string
  isActive?: boolean
  search?: string
  page?: number
  limit?: number
}

export interface AccountListResponse {
  accounts: ChartOfAccounts[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface BudgetFilters {
  fiscalYear?: string
  budgetPeriod?: string
  status?: string
  departmentId?: string
  search?: string
  page?: number
  limit?: number
}

export interface BudgetListResponse {
  budgets: Budget[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}