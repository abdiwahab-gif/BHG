'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useHRDashboard } from '@/hooks/use-hr'
import { Users, Clock, Calendar, TrendingUp, AlertTriangle } from 'lucide-react'
import { HREmployeesTab } from '@/components/hr/hr-employees-tab'
import { HRAttendanceTab } from '@/components/hr/hr-attendance-tab'
import { HRLeaveTab } from '@/components/hr/hr-leave-tab'
import { HRPerformanceTab } from '@/components/hr/hr-performance-tab'

export default function HRPage() {
  const { data: dashboardData, loading, error, fetchDashboard } = useHRDashboard()

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Human Resources</h1>
        <p className="text-muted-foreground">
          Manage employees, attendance, leave, and performance reviews
        </p>
      </div>

      {/* Dashboard Cards */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {dashboardData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                +{dashboardData.newEmployeesThisMonth} from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present Today</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.presentToday}</div>
              <p className="text-xs text-muted-foreground">
                {((dashboardData.presentToday / dashboardData.totalEmployees) * 100).toFixed(1)}% attendance rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Leave Requests</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.pendingLeaveRequests}</div>
              <p className="text-xs text-muted-foreground">
                Require manager approval
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          <HREmployeesTab />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <HRAttendanceTab />
        </TabsContent>

        <TabsContent value="leave" className="space-y-4">
          <HRLeaveTab />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <HRPerformanceTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}