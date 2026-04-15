"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp, 
  Building2, 
  Calendar,
  Users,
  Package,
  DollarSign
} from "lucide-react"
import { useProcurementStats } from "@/hooks/use-procurement"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts"

const COLORS = ["#f59e0b", "#fbbf24", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899"]

export function ProcurementDashboard() {
  const { data: stats, isLoading, error } = useProcurementStats()

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            Failed to load dashboard data. Please try again.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const departmentData = stats.departmentBreakdown.map(dept => ({
    name: dept.department,
    value: dept.count,
    amount: dept.amount
  }))

  const monthlyData = stats.monthlyTrends.map(trend => ({
    month: trend.month,
    requisitions: trend.requisitions,
    amount: trend.amount / 1000 // Convert to thousands for better display
  }))

  const approvalRate = stats.totalRequisitions > 0 
    ? (stats.approvedRequisitions / stats.totalRequisitions) * 100 
    : 0

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvalRate.toFixed(1)}%</div>
            <Progress value={approvalRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.approvedRequisitions} of {stats.totalRequisitions} approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.departmentBreakdown.length}</div>
            <p className="text-xs text-muted-foreground">
              Departments with requisitions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Processing Time</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2 days</div>
            <p className="text-xs text-muted-foreground">
              From submission to approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost per Requisition</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalRequisitions > 0 
                ? (stats.totalProcurementValue / stats.totalRequisitions).toLocaleString(undefined, {maximumFractionDigits: 0})
                : '0'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Average value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Department Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Requisitions by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            {departmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} requisitions`, name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No department data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'requisitions' ? `${value} requisitions` : `$${value}k`,
                      name === 'requisitions' ? 'Requisitions' : 'Amount'
                    ]}
                  />
                  <Bar yAxisId="left" dataKey="requisitions" fill="#f59e0b" />
                  <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No trend data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Department Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {departmentData.map((dept, index) => (
              <div key={dept.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <p className="font-medium">{dept.name}</p>
                    <p className="text-sm text-gray-500">{dept.value} requisitions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">${dept.amount.toLocaleString()}</p>
                  <Badge variant="secondary" className="text-xs">
                    ${(dept.amount / dept.value).toLocaleString()} avg
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}