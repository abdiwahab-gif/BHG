import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardOverview } from "@/components/finance/dashboard-overview"
import { StudentAccountsTable } from "@/components/finance/student-accounts-table"
import { PayrollTable } from "@/components/finance/payroll-table"
import { BillsTable } from "@/components/finance/bills-table"
import { JournalEntriesTable } from "@/components/finance/journal-entries-table"
import { ReportsSection } from "@/components/finance/reports-section"
import { ChartOfAccountsManager } from "@/components/finance/chart-of-accounts-manager"

export default function FinancePage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance Management</h1>
          <p className="text-muted-foreground">
            Comprehensive financial management for your institution
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="student-accounts">Student Accounts</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="bills">Bills & A/P</TabsTrigger>
          <TabsTrigger value="journal">Journal Entries</TabsTrigger>
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Dashboard</CardTitle>
              <CardDescription>
                Overview of your institution's financial health and key metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading dashboard...</div>}>
                <DashboardOverview />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="student-accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Fee Management</CardTitle>
              <CardDescription>
                Manage student accounts, fees, and payment tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading student accounts...</div>}>
                <StudentAccountsTable />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Management</CardTitle>
              <CardDescription>
                Process payroll, manage employee compensation and benefits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading payroll data...</div>}>
                <PayrollTable />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bills & Accounts Payable</CardTitle>
              <CardDescription>
                Manage vendor bills, purchase orders, and payment processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading bills...</div>}>
                <BillsTable />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Journal Entries</CardTitle>
              <CardDescription>
                View and manage all financial transactions and accounting entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading journal entries...</div>}>
                <JournalEntriesTable />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <Suspense fallback={<div>Loading chart of accounts...</div>}>
            <ChartOfAccountsManager />
          </Suspense>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
              <CardDescription>
                Generate comprehensive financial statements and analysis reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading reports...</div>}>
                <ReportsSection />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}