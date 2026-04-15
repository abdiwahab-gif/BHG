"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, ShoppingCart, FileText, DollarSign, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useProcurementStats } from "@/hooks/use-procurement"

export function ProcurementHeader() {
  const router = useRouter()
  const { data: stats, isLoading } = useProcurementStats()

  const handleCreateRequisition = () => {
    router.push("/procurement/requisitions/new")
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-gray-200 rounded animate-pulse" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Procurement Management</h1>
          <p className="text-gray-500">
            Manage requisitions, purchase orders, and vendor relationships
          </p>
        </div>
        <Button onClick={handleCreateRequisition} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="h-4 w-4 mr-2" />
          New Requisition
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requisitions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingRequisitions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchase Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPurchaseOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Procurement Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.totalProcurementValue?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Current fiscal year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.pendingPayments || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Badge 
          variant="secondary" 
          className="cursor-pointer hover:bg-gray-200"
          onClick={() => router.push("/procurement?status=pending")}
        >
          Pending Approvals ({stats?.pendingRequisitions || 0})
        </Badge>
        <Badge 
          variant="secondary" 
          className="cursor-pointer hover:bg-gray-200"
          onClick={() => router.push("/procurement?status=approved")}
        >
          Approved ({stats?.approvedRequisitions || 0})
        </Badge>
        <Badge 
          variant="secondary" 
          className="cursor-pointer hover:bg-gray-200"
          onClick={() => router.push("/procurement/purchase-orders?status=pending")}
        >
          Pending Payments ({stats?.pendingPayments || 0})
        </Badge>
      </div>
    </div>
  )
}