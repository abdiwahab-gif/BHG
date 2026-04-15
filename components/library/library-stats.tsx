"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Book, 
  Users, 
  Calendar, 
  AlertTriangle, 
  BookOpen, 
  Clock,
  TrendingUp,
  DollarSign,
  User,
  GraduationCap,
  UserCheck
} from "lucide-react"
import { useLibraryDashboard } from "@/hooks/use-library"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export function LibraryStats() {
  const { data, loading, error, refetch } = useLibraryDashboard()

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={refetch} variant="outline" size="sm">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalBooks.toLocaleString()}</div>
            <p className="text-xs text-amber-600">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalMembers.toLocaleString()}</div>
            <p className="text-xs text-amber-600">
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Borrows</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeBorrows.toLocaleString()}</div>
            <p className="text-xs text-blue-600">
              {((data.activeBorrows / data.totalBooks) * 100).toFixed(1)}% utilization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Books</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.overdueBorrows.toLocaleString()}</div>
            <p className="text-xs text-red-600">
              {((data.overdueBorrows / data.activeBorrows) * 100).toFixed(1)}% of active borrows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservations</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalReservations.toLocaleString()}</div>
            <p className="text-xs text-orange-600">
              Pending fulfillment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Books</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{data.availableBooks.toLocaleString()}</div>
            <p className="text-xs text-amber-600">
              Ready for borrowing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.membershipStats.students.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((data.membershipStats.students / data.totalMembers) * 100).toFixed(1)}% of members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faculty & Staff</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data.membershipStats.teachers + data.membershipStats.staff).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.membershipStats.teachers} teachers, {data.membershipStats.staff} staff
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Books by Category</CardTitle>
            <CardDescription>Distribution of books across different categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.categoryStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="category" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Member Distribution</CardTitle>
            <CardDescription>Breakdown of library members by type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Students', value: data.membershipStats.students },
                    { name: 'Teachers', value: data.membershipStats.teachers },
                    { name: 'Staff', value: data.membershipStats.staff }
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
                    { name: 'Students', value: data.membershipStats.students },
                    { name: 'Teachers', value: data.membershipStats.teachers },
                    { name: 'Staff', value: data.membershipStats.staff }
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

      {/* Popular Books and Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Popular Books</CardTitle>
            <CardDescription>Most frequently borrowed books</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.popularBooks.slice(0, 5).map((item, index) => (
                <div key={item.book.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center">
                      {index + 1}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.book.title}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      by {item.book.author}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge variant="outline">
                      {item.borrowCount} borrows
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest library transactions and events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivities.slice(0, 5).map((activity, index) => (
                <div key={activity.id} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {activity.type === 'borrow' && <Calendar className="h-4 w-4 text-blue-500" />}
                    {activity.type === 'return' && <BookOpen className="h-4 w-4 text-amber-500" />}
                    {activity.type === 'reserve' && <Clock className="h-4 w-4 text-orange-500" />}
                    {activity.type === 'add_book' && <Book className="h-4 w-4 text-purple-500" />}
                    {activity.type === 'fine_paid' && <DollarSign className="h-4 w-4 text-red-500" />}
                    {activity.type === 'member_registered' && <User className="h-4 w-4 text-indigo-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}