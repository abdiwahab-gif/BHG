"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  FileText,
  Calendar,
  DollarSign
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useRequisitions } from "@/hooks/use-procurement"
import { RequisitionFilters } from "@/types/procurement"
import { format } from "date-fns"

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800"
}

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
}

export function RequisitionsTable() {
  const router = useRouter()
  const [filters, setFilters] = useState<RequisitionFilters>({
    page: 1,
    limit: 10,
    search: "",
    status: undefined,
    priority: undefined,
    department: undefined,
    dateFrom: undefined,
    dateTo: undefined
  })

  const { data, isLoading, error } = useRequisitions(filters)

  const handleCreateRequisition = () => {
    router.push("/procurement/requisitions/new")
  }

  const handleViewRequisition = (id: string) => {
    router.push(`/procurement/requisitions/${id}`)
  }

  const handleEditRequisition = (id: string) => {
    router.push(`/procurement/requisitions/${id}/edit`)
  }

  const handleDeleteRequisition = (id: string) => {
    if (confirm("Are you sure you want to delete this requisition?")) {
      // TODO: Implement delete functionality
      console.log("Deleting requisition:", id)
    }
  }

  const handleFilterChange = (key: keyof RequisitionFilters, value: any) => {
    setFilters((prev: RequisitionFilters) => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }))
  }

  const handlePageChange = (page: number) => {
    setFilters((prev: RequisitionFilters) => ({ ...prev, page }))
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            Failed to load requisitions. Please try again.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Requisitions
          </CardTitle>
          <Button onClick={handleCreateRequisition} className="bg-amber-500 hover:bg-amber-600">
            <Plus className="h-4 w-4 mr-2" />
            New Requisition
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search requisitions..."
                  value={filters.search || ""}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => handleFilterChange("status", value === "all" ? undefined : value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.priority || "all"}
              onValueChange={(value) => handleFilterChange("priority", value === "all" ? undefined : value)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Department"
              value={filters.department || ""}
              onChange={(e) => handleFilterChange("department", e.target.value)}
              className="w-[150px]"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>REQ ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.requisitions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        No requisitions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.requisitions.map((requisition) => (
                      <TableRow key={requisition.id}>
                        <TableCell className="font-medium">
                          {requisition.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>{requisition.requestingDepartment}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{requisition.items.length} items</span>
                            <span className="text-sm text-gray-500">
                              {requisition.items[0]?.name}
                              {requisition.items.length > 1 && ` +${requisition.items.length - 1} more`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {requisition.totalEstimatedAmount.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={priorityColors[requisition.priority]}
                          >
                            {requisition.priority.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={statusColors[requisition.status]}
                          >
                            {requisition.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(requisition.createdAt), "MMM dd, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleViewRequisition(requisition.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {(requisition.status === "draft" || requisition.status === "submitted") && (
                                <DropdownMenuItem onClick={() => handleEditRequisition(requisition.id)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteRequisition(requisition.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{" "}
                  {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{" "}
                  {data.pagination.total} results
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(data.pagination.page - 1)}
                    disabled={data.pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(data.pagination.page + 1)}
                    disabled={data.pagination.page === data.pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}