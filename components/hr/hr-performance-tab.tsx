'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, TrendingUp, Star, Calendar, Eye, Edit } from 'lucide-react'
import { usePerformance } from '@/hooks/use-hr'

export function HRPerformanceTab() {
  const { 
    performanceReviews, 
    total, 
    loading, 
    error, 
    fetchPerformanceReviews, 
    createPerformanceReview 
  } = usePerformance()

  const [statusFilter, setStatusFilter] = useState('all')
  const [reviewTypeFilter, setReviewTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchPerformanceReviews({
      page: currentPage,
      limit: 10,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      reviewType: reviewTypeFilter !== 'all' ? reviewTypeFilter : undefined,
    })
  }, [fetchPerformanceReviews, currentPage, statusFilter, reviewTypeFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-amber-100 text-amber-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'in-progress': return 'bg-yellow-100 text-yellow-800'
      case 'not-started': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Performance Reviews</h2>
          <p className="text-muted-foreground">
            Manage employee performance evaluations and development plans
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Review
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceReviews.length}</div>
            <p className="text-xs text-muted-foreground">
              This period
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceReviews.filter(r => r.status === 'completed').length}</div>
            <p className="text-xs text-muted-foreground">
              Reviews completed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceReviews.length > 0 
                ? (performanceReviews.reduce((sum, r) => sum + r.overallRating, 0) / performanceReviews.length).toFixed(1)
                : '0.0'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Out of 5.0
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceReviews.filter(r => r.status === 'in-progress').length}</div>
            <p className="text-xs text-muted-foreground">
              Reviews in progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Performance Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="not-started">Not Started</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={reviewTypeFilter} onValueChange={setReviewTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Review Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="probation">Probation</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="360">360 Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Reviews Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Performance Reviews</CardTitle>
            <div className="text-sm text-muted-foreground">
              {total} reviews found
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading performance reviews...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Review Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Overall Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>{review.employeeId}</TableCell>
                    <TableCell className="capitalize">{review.reviewType}</TableCell>
                    <TableCell>
                      {new Date(review.reviewPeriodStart).toLocaleDateString()} - {new Date(review.reviewPeriodEnd).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {getRatingStars(review.overallRating)}
                        </div>
                        <span className="text-sm font-medium">{review.overallRating.toFixed(1)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(review.status)}>
                        {review.status.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(review.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && !error && performanceReviews.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No performance reviews found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}