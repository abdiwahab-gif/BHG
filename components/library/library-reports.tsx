"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts"
import { 
  TrendingUp, 
  Download, 
  Calendar, 
  BookOpen,
  Users,
  DollarSign,
  Clock,
  AlertTriangle,
  Filter,
  FileText
} from "lucide-react"
import { useLibraryDashboard } from "@/hooks/use-library"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export function LibraryReports() {
  const [reportType, setReportType] = useState("overview")
  const [dateRange, setDateRange] = useState("6months")
  const { data: dashboardData } = useLibraryDashboard()

  const exportReport = (type: string) => {
    // In a real app, this would generate and download the report
    console.log(`Exporting ${type} report...`)
    // For demo purposes, we'll just show a success message
    alert(`${type.charAt(0).toUpperCase() + type.slice(1)} report exported successfully!`)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Library Reports</h2>
          <p className="text-muted-foreground">
            Analytics and insights for library operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => exportReport('comprehensive')}>
            <Download className="mr-2 h-4 w-4" />
            Export All
          </Button>
        </div>
      </div>

      {/* Report Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Report Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            <Button
              variant={reportType === "overview" ? "default" : "outline"}
              onClick={() => setReportType("overview")}
              className="justify-start"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Overview
            </Button>
            <Button
              variant={reportType === "circulation" ? "default" : "outline"}
              onClick={() => setReportType("circulation")}
              className="justify-start"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Circulation
            </Button>
            <Button
              variant={reportType === "members" ? "default" : "outline"}
              onClick={() => setReportType("members")}
              className="justify-start"
            >
              <Users className="mr-2 h-4 w-4" />
              Members
            </Button>
            <Button
              variant={reportType === "financial" ? "default" : "outline"}
              onClick={() => setReportType("financial")}
              className="justify-start"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Financial
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overview Report */}
      {reportType === "overview" && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Books</p>
                    <p className="text-2xl font-bold">{dashboardData?.totalBooks.toLocaleString() || 0}</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Members</p>
                    <p className="text-2xl font-bold">{dashboardData?.totalMembers.toLocaleString() || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Current Borrows</p>
                    <p className="text-2xl font-bold">{dashboardData?.activeBorrows.toLocaleString() || 0}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Overdue Books</p>
                    <p className="text-2xl font-bold text-red-600">{dashboardData?.overdueBorrows.toLocaleString() || 0}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Book Categories Distribution</CardTitle>
                <CardDescription>Number of books by category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboardData?.categoryStats || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {(dashboardData?.categoryStats || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Borrowed Categories</CardTitle>
                <CardDescription>Most popular book categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockTopCategories}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="borrows" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Circulation Report */}
      {reportType === "circulation" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Circulation Analysis</h3>
            <Button variant="outline" onClick={() => exportReport('circulation')}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Circulation Trends</CardTitle>
                <CardDescription>Borrows, returns, and overdue books</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboardData?.monthlyData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="borrows" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="returns" stroke="#82ca9d" strokeWidth={2} />
                    <Line type="monotone" dataKey="overdue" stroke="#ff7300" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Book Utilization Rate</CardTitle>
                <CardDescription>Usage statistics over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dashboardData?.monthlyData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="borrows" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="returns" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Popular Books Table */}
          <Card>
            <CardHeader>
              <CardTitle>Most Popular Books</CardTitle>
              <CardDescription>Books with highest circulation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData?.popularBooks.slice(0, 10).map((item, index) => (
                  <div key={item.book.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium">{item.book.title}</p>
                        <p className="text-sm text-muted-foreground">by {item.book.author}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{item.borrowCount} borrows</p>
                      <p className="text-sm text-muted-foreground">{item.book.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Members Report */}
      {reportType === "members" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Membership Analysis</h3>
            <Button variant="outline" onClick={() => exportReport('members')}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Membership Growth</CardTitle>
                <CardDescription>Member registration trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={mockMembershipGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="students" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="teachers" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                    <Area type="monotone" dataKey="staff" stackId="1" stroke="#ffc658" fill="#ffc658" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Member Distribution</CardTitle>
                <CardDescription>Current membership breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Students', value: dashboardData?.membershipStats.students || 0 },
                        { name: 'Teachers', value: dashboardData?.membershipStats.teachers || 0 },
                        { name: 'Staff', value: dashboardData?.membershipStats.staff || 0 }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Students', value: dashboardData?.membershipStats.students || 0 },
                        { name: 'Teachers', value: dashboardData?.membershipStats.teachers || 0 },
                        { name: 'Staff', value: dashboardData?.membershipStats.staff || 0 }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Financial Report */}
      {reportType === "financial" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Financial Analysis</h3>
            <Button variant="outline" onClick={() => exportReport('financial')}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Fines Collected</p>
                    <p className="text-2xl font-bold text-amber-600">$2,840</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending Fines</p>
                    <p className="text-2xl font-bold text-orange-600">$785</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Average Fine</p>
                    <p className="text-2xl font-bold">$12.50</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Fine Collection Trends</CardTitle>
              <CardDescription>Monthly fine collection and pending amounts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockFineCollection}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="collected" fill="#82ca9d" name="Collected" />
                  <Bar dataKey="pending" fill="#ff7300" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}