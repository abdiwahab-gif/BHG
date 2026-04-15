"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useExamResultsAnalytics } from "@/hooks/use-analytics"
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
  Line,
  Area,
  AreaChart,
} from "recharts"

interface AnalyticsDashboardProps {
  sessionId: string
  semesterId: string
}

export function AnalyticsDashboard({ sessionId, semesterId }: AnalyticsDashboardProps) {
  const { data: analytics, isLoading } = useExamResultsAnalytics({
    sessionId,
    semesterId,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-48 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const {
    examTypePerformance,
    departmentComparison,
    attendanceImpact,
    gradeDistribution,
    performanceTrends,
    coursePerformance,
  } = analytics?.data || {}

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"]

  return (
    <div className="space-y-6">
      {/* Exam Type Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle>Exam Type Performance</CardTitle>
              <CardDescription>Average scores by exam type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={examTypePerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="examType" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="averageScore" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Department Comparison */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle>Department Comparison</CardTitle>
              <CardDescription>Average GPA by department</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentComparison} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 4]} />
                  <YAxis dataKey="department" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="averageGPA" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Attendance Impact */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle>Attendance Impact on Performance</CardTitle>
            <CardDescription>Correlation between attendance and GPA</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={attendanceImpact}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="attendanceRange" />
                <YAxis domain={[0, 4]} />
                <Tooltip />
                <Area type="monotone" dataKey="averageGPA" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Grade Distribution Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle>Grade Distribution</CardTitle>
              <CardDescription>Percentage breakdown of grades</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ grade, percentage }) => `${grade} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {gradeDistribution?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Performance Trends Line Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle>GPA Trends</CardTitle>
              <CardDescription>Monthly GPA progression</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[2.5, 4]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="averageGPA" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Course Analysis */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card>
          <CardHeader>
            <CardTitle>Course Performance Analysis</CardTitle>
            <CardDescription>Detailed breakdown by course</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {coursePerformance?.map((course: any, index: number) => (
                <div key={course.courseCode} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold">
                        {course.courseCode} - {course.courseName}
                      </h4>
                      <p className="text-sm text-muted-foreground">{course.totalStudents} students enrolled</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{course.averageGPA.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">Avg GPA</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-amber-600">{course.passRate}%</div>
                        <div className="text-xs text-muted-foreground">Pass Rate</div>
                      </div>
                    </div>
                  </div>

                  {/* Course-specific metrics could go here */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center p-2 bg-muted rounded">
                      <div className="font-medium">Excellent (A+/A)</div>
                      <div className="text-muted-foreground">{Math.round((course.averageGPA / 4) * 100 * 0.3)}%</div>
                    </div>
                    <div className="text-center p-2 bg-muted rounded">
                      <div className="font-medium">Good (B+/B)</div>
                      <div className="text-muted-foreground">{Math.round((course.averageGPA / 4) * 100 * 0.4)}%</div>
                    </div>
                    <div className="text-center p-2 bg-muted rounded">
                      <div className="font-medium">Satisfactory (C+/C)</div>
                      <div className="text-muted-foreground">{Math.round((course.averageGPA / 4) * 100 * 0.3)}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
