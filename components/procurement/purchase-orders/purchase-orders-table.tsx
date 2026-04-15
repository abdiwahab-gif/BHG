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
  Search, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  ShoppingCart,
  Calendar,
  DollarSign,
  Building,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react"
import { useRouter } from "next/navigation"
import { usePurchaseOrders } from "@/hooks/use-procurement"
import { PurchaseOrderFilters } from "@/types/procurement"
import { format } from "date-fns"

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  acknowledged: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-orange-100 text-orange-800",
  completed: "bg-amber-100 text-amber-800",
  cancelled: "bg-red-100 text-red-800"
}

const budgetStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-800"
}

export function PurchaseOrdersTable() {
  const router = useRouter()
  const [filters, setFilters] = useState<PurchaseOrderFilters>({
    page: 1,
    limit: 10,
    search: "",
    status: undefined,
    vendor: undefined,
    paymentStatus: undefined,
    dateFrom: undefined,
    dateTo: undefined
  })

  const { data, isLoading, error } = usePurchaseOrders(filters)

  const handleViewPurchaseOrder = (id: string) => {
    router.push(`/procurement/purchase-orders/${id}`)
  }

  const handleEditPurchaseOrder = (id: string) => {
    router.push(`/procurement/purchase-orders/${id}/edit`)
  }

  const handleDeletePurchaseOrder = (id: string) => {
    if (confirm("Are you sure you want to delete this purchase order?")) {
      // TODO: Implement delete functionality
      console.log("Deleting purchase order:", id)
    }
  }

  const handleFilterChange = (key: keyof PurchaseOrderFilters, value: any) => {
    setFilters((prev: PurchaseOrderFilters) => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }))
  }

  const handlePageChange = (page: number) => {
    setFilters((prev: PurchaseOrderFilters) => ({ ...prev, page }))
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            Failed to load purchase orders. Please try again.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Purchase Orders
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search purchase orders..."
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
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.paymentStatus || "all"}
              onValueChange={(value) => handleFilterChange("paymentStatus", value === "all" ? undefined : value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Vendor"
              value={filters.vendor || ""}
              onChange={(e) => handleFilterChange("vendor", e.target.value)}
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
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Requisition</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Budget Status</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.purchaseOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        No purchase orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.purchaseOrders.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium">
                          {po.poNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{po.vendorName}</span>
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {po.vendorContact}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {po.requisition.requestingDepartment}
                            </span>
                            <span className="text-sm text-gray-500">
                              {po.requisition.items.length} items
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {po.totalAmount.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={statusColors[po.status]}
                          >
                            {po.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary" 
                              className={po.budgetApproved ? budgetStatusColors['approved'] : 
                                         po.budgetApprovedBy ? budgetStatusColors['rejected'] : 
                                         budgetStatusColors['pending']}
                            >
                              {po.budgetApproved ? 'APPROVED' : 
                               po.budgetApprovedBy ? 'REJECTED' : 'PENDING'}
                            </Badge>
                            {po.budgetApproved && (
                              <CheckCircle className="h-4 w-4 text-amber-600" />
                            )}
                            {po.budgetApprovedBy && !po.budgetApproved && (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            {!po.budgetApprovedBy && (
                              <Clock className="h-4 w-4 text-yellow-600" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(po.expectedDeliveryDate), "MMM dd, yyyy")}
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
                              <DropdownMenuItem onClick={() => handleViewPurchaseOrder(po.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {po.status === "draft" && (
                                <DropdownMenuItem onClick={() => handleEditPurchaseOrder(po.id)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeletePurchaseOrder(po.id)}
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