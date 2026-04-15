"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileBarChart, Download, Calendar, TrendingUp, DollarSign, PieChart, BarChart3, FileText, Calculator } from "lucide-react"

export function ReportsSection() {
  const [selectedReport, setSelectedReport] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [reportFormat, setReportFormat] = useState("PDF")

  const downloadReport = async (reportId: string, overrides?: { dateFrom?: string; dateTo?: string; asOf?: string }) => {
    const params = new URLSearchParams()
    params.set("format", reportFormat)

    const from = overrides?.dateFrom ?? dateFrom
    const to = overrides?.dateTo ?? dateTo
    const asOf = overrides?.asOf

    if (from) params.set("dateFrom", from)
    if (to) params.set("dateTo", to)
    if (asOf) params.set("asOf", asOf)

    const res = await fetch(`/api/finance/reports/${encodeURIComponent(reportId)}?${params.toString()}`)
    if (!res.ok) {
      let message = "Failed to generate report"
      try {
        const data = await res.json()
        message = data?.message || data?.error || message
      } catch {
        // ignore
      }
      alert(message)
      return
    }

    const blob = await res.blob()
    const disposition = res.headers.get("content-disposition") || ""
    const match = disposition.match(/filename=\"?([^\";]+)\"?/i)
    const fallbackExt = reportFormat === "EXCEL" ? "xlsx" : reportFormat.toLowerCase()
    const fileName = match?.[1] || `${reportId}.${fallbackExt}`

    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  const financialReports = [
    {
      id: "balance-sheet",
      name: "Balance Sheet",
      description: "Assets, liabilities, and equity at a specific point in time",
      icon: <Calculator className="h-5 w-5" />,
      category: "Financial Statements"
    },
    {
      id: "income-statement",
      name: "Income Statement",
      description: "Revenue and expenses over a period of time",
      icon: <TrendingUp className="h-5 w-5" />,
      category: "Financial Statements"
    },
    {
      id: "cash-flow",
      name: "Cash Flow Statement",
      description: "Cash inflows and outflows during a specific period",
      icon: <DollarSign className="h-5 w-5" />,
      category: "Financial Statements"
    },
    {
      id: "trial-balance",
      name: "Trial Balance",
      description: "List of all accounts with their debit and credit balances",
      icon: <FileBarChart className="h-5 w-5" />,
      category: "General Ledger"
    },
    {
      id: "general-ledger",
      name: "General Ledger",
      description: "Detailed record of all financial transactions",
      icon: <FileText className="h-5 w-5" />,
      category: "General Ledger"
    },
    {
      id: "accounts-receivable",
      name: "Accounts Receivable Aging",
      description: "Outstanding student fees by aging periods",
      icon: <PieChart className="h-5 w-5" />,
      category: "Receivables"
    },
    {
      id: "accounts-payable",
      name: "Accounts Payable Aging",
      description: "Outstanding vendor bills by aging periods",
      icon: <BarChart3 className="h-5 w-5" />,
      category: "Payables"
    },
    {
      id: "student-fees-summary",
      name: "Student Fees Summary",
      description: "Summary of student fee collections and outstanding balances",
      icon: <FileBarChart className="h-5 w-5" />,
      category: "Student Finance"
    },
    {
      id: "payroll-summary",
      name: "Payroll Summary",
      description: "Payroll expenses, taxes, and deductions summary",
      icon: <TrendingUp className="h-5 w-5" />,
      category: "Payroll"
    },
    {
      id: "budget-vs-actual",
      name: "Budget vs Actual",
      description: "Comparison of budgeted amounts vs actual performance",
      icon: <BarChart3 className="h-5 w-5" />,
      category: "Budget Analysis"
    }
  ]

  const groupedReports = financialReports.reduce((acc, report) => {
    if (!acc[report.category]) {
      acc[report.category] = []
    }
    acc[report.category].push(report)
    return acc
  }, {} as Record<string, typeof financialReports>)

  const generateReport = async () => {
    if (!selectedReport) return

    if (selectedReport === "balance-sheet") {
      const asOf = dateTo || new Date().toISOString().slice(0, 10)
      await downloadReport(selectedReport, { asOf })
      return
    }

    await downloadReport(selectedReport)
  }

  return (
    <div className="space-y-6">
      {/* Report Categories */}
      <Tabs defaultValue="financial-statements" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="financial-statements">Financial Statements</TabsTrigger>
          <TabsTrigger value="ledger">General Ledger</TabsTrigger>
          <TabsTrigger value="student-finance">Student Finance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="financial-statements" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupedReports["Financial Statements"]?.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {report.icon}
                    {report.name}
                  </CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" onClick={() => setSelectedReport(report.id)}>
                        <Download className="h-4 w-4 mr-2" />
                        Generate Report
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Generate {report.name}</DialogTitle>
                        <DialogDescription>{report.description}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`date-from-${report.id}`}>From Date</Label>
                            <Input
                              id={`date-from-${report.id}`}
                              type="date"
                              value={dateFrom}
                              onChange={(e) => setDateFrom(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`date-to-${report.id}`}>To Date</Label>
                            <Input
                              id={`date-to-${report.id}`}
                              type="date"
                              value={dateTo}
                              onChange={(e) => setDateTo(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`format-${report.id}`}>Report Format</Label>
                          <Select value={reportFormat} onValueChange={setReportFormat}>
                            <SelectTrigger id={`format-${report.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PDF">PDF</SelectItem>
                              <SelectItem value="EXCEL">Excel</SelectItem>
                              <SelectItem value="CSV">CSV</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button className="w-full" onClick={generateReport}>
                          <Download className="h-4 w-4 mr-2" />
                          Generate & Download
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupedReports["General Ledger"]?.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {report.icon}
                    {report.name}
                  </CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" onClick={() => setSelectedReport(report.id)}>
                        <Download className="h-4 w-4 mr-2" />
                        Generate Report
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Generate {report.name}</DialogTitle>
                        <DialogDescription>{report.description}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`date-from-${report.id}`}>From Date</Label>
                            <Input
                              id={`date-from-${report.id}`}
                              type="date"
                              value={dateFrom}
                              onChange={(e) => setDateFrom(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`date-to-${report.id}`}>To Date</Label>
                            <Input
                              id={`date-to-${report.id}`}
                              type="date"
                              value={dateTo}
                              onChange={(e) => setDateTo(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`format-${report.id}`}>Report Format</Label>
                          <Select value={reportFormat} onValueChange={setReportFormat}>
                            <SelectTrigger id={`format-${report.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PDF">PDF</SelectItem>
                              <SelectItem value="EXCEL">Excel</SelectItem>
                              <SelectItem value="CSV">CSV</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button className="w-full" onClick={generateReport}>
                          <Download className="h-4 w-4 mr-2" />
                          Generate & Download
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="student-finance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupedReports["Student Finance"]?.concat(groupedReports["Receivables"] || []).map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {report.icon}
                    {report.name}
                  </CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" onClick={() => setSelectedReport(report.id)}>
                        <Download className="h-4 w-4 mr-2" />
                        Generate Report
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Generate {report.name}</DialogTitle>
                        <DialogDescription>{report.description}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`date-from-${report.id}`}>From Date</Label>
                            <Input
                              id={`date-from-${report.id}`}
                              type="date"
                              value={dateFrom}
                              onChange={(e) => setDateFrom(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`date-to-${report.id}`}>To Date</Label>
                            <Input
                              id={`date-to-${report.id}`}
                              type="date"
                              value={dateTo}
                              onChange={(e) => setDateTo(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`format-${report.id}`}>Report Format</Label>
                          <Select value={reportFormat} onValueChange={setReportFormat}>
                            <SelectTrigger id={`format-${report.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PDF">PDF</SelectItem>
                              <SelectItem value="EXCEL">Excel</SelectItem>
                              <SelectItem value="CSV">CSV</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button className="w-full" onClick={generateReport}>
                          <Download className="h-4 w-4 mr-2" />
                          Generate & Download
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupedReports["Payroll"]?.concat(groupedReports["Payables"] || []).map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {report.icon}
                    {report.name}
                  </CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" onClick={() => setSelectedReport(report.id)}>
                        <Download className="h-4 w-4 mr-2" />
                        Generate Report
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Generate {report.name}</DialogTitle>
                        <DialogDescription>{report.description}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`date-from-${report.id}`}>From Date</Label>
                            <Input
                              id={`date-from-${report.id}`}
                              type="date"
                              value={dateFrom}
                              onChange={(e) => setDateFrom(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`date-to-${report.id}`}>To Date</Label>
                            <Input
                              id={`date-to-${report.id}`}
                              type="date"
                              value={dateTo}
                              onChange={(e) => setDateTo(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`format-${report.id}`}>Report Format</Label>
                          <Select value={reportFormat} onValueChange={setReportFormat}>
                            <SelectTrigger id={`format-${report.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PDF">PDF</SelectItem>
                              <SelectItem value="EXCEL">Excel</SelectItem>
                              <SelectItem value="CSV">CSV</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button className="w-full" onClick={generateReport}>
                          <Download className="h-4 w-4 mr-2" />
                          Generate & Download
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupedReports["Budget Analysis"]?.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {report.icon}
                    {report.name}
                  </CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" onClick={() => setSelectedReport(report.id)}>
                        <Download className="h-4 w-4 mr-2" />
                        Generate Report
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Generate {report.name}</DialogTitle>
                        <DialogDescription>{report.description}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`date-from-${report.id}`}>From Date</Label>
                            <Input
                              id={`date-from-${report.id}`}
                              type="date"
                              value={dateFrom}
                              onChange={(e) => setDateFrom(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`date-to-${report.id}`}>To Date</Label>
                            <Input
                              id={`date-to-${report.id}`}
                              type="date"
                              value={dateTo}
                              onChange={(e) => setDateTo(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`format-${report.id}`}>Report Format</Label>
                          <Select value={reportFormat} onValueChange={setReportFormat}>
                            <SelectTrigger id={`format-${report.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PDF">PDF</SelectItem>
                              <SelectItem value="EXCEL">Excel</SelectItem>
                              <SelectItem value="CSV">CSV</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button className="w-full" onClick={generateReport}>
                          <Download className="h-4 w-4 mr-2" />
                          Generate & Download
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Quick Reports
          </CardTitle>
          <CardDescription>
            Generate commonly used reports with predefined date ranges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col gap-2"
              onClick={() => {
                const now = new Date()
                const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
                void downloadReport("income-statement", { dateFrom: start, dateTo: end })
              }}
            >
              <FileBarChart className="h-6 w-6" />
              <span className="font-medium">Current Month P&L</span>
              <span className="text-xs text-muted-foreground">Income Statement</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col gap-2"
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10)
                void downloadReport("balance-sheet", { asOf: today })
              }}
            >
              <Calculator className="h-6 w-6" />
              <span className="font-medium">Current Balance Sheet</span>
              <span className="text-xs text-muted-foreground">As of today</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col gap-2"
              onClick={() => {
                void downloadReport("accounts-receivable")
              }}
            >
              <PieChart className="h-6 w-6" />
              <span className="font-medium">A/R Aging</span>
              <span className="text-xs text-muted-foreground">Overdue student fees</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col gap-2"
              onClick={() => {
                void downloadReport("accounts-payable")
              }}
            >
              <BarChart3 className="h-6 w-6" />
              <span className="font-medium">A/P Aging</span>
              <span className="text-xs text-muted-foreground">Overdue vendor bills</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}