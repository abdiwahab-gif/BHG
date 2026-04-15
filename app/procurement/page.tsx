import { Suspense } from "react"
import { ProcurementHeader } from "@/components/procurement/procurement-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Package, ShoppingCart, BarChart3, FileText, Building2, DollarSign } from "lucide-react"

// Import the actual components directly - they should work now
function ProcurementDashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Procurement Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-sm text-gray-500">Total Requisitions</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-sm text-gray-500">Pending Approvals</p>
                </div>
                <Package className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">8</div>
                  <p className="text-sm text-gray-500">Purchase Orders</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">$45,230</div>
                  <p className="text-sm text-gray-500">Total Value</p>
                </div>
                <DollarSign className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Requisition REQ-001 approved</p>
                    <p className="text-xs text-gray-500">Engineering Department</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Purchase Order PO-001 created</p>
                    <p className="text-xs text-gray-500">Office Supplies</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Budget approval pending</p>
                    <p className="text-xs text-gray-500">IT Department</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Department Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm">Engineering</span>
                  </div>
                  <span className="text-sm font-medium">6 requests</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm">IT Department</span>
                  </div>
                  <span className="text-sm font-medium">8 requests</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm">Administration</span>
                  </div>
                  <span className="text-sm font-medium">4 requests</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm">Science Lab</span>
                  </div>
                  <span className="text-sm font-medium">6 requests</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}

function RequisitionsTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Requisitions Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-4">
          <input 
            type="text" 
            placeholder="Search requisitions..." 
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <select className="px-3 py-2 border rounded-md">
            <option>All Status</option>
            <option>Draft</option>
            <option>Submitted</option>
            <option>Under Review</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
        </div>
        <div className="space-y-3">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium">Office Supplies Request</div>
                <div className="text-sm text-gray-500">REQ-2024-001 • Engineering Department</div>
              </div>
              <div className="text-right">
                <div className="font-medium">$1,200</div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                  Under Review
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600">Requested: Pens, Paper, Notebooks, Markers</div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium">Computer Equipment</div>
                <div className="text-sm text-gray-500">REQ-2024-002 • IT Department</div>
              </div>
              <div className="text-right">
                <div className="font-medium">$5,500</div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800">
                  Approved
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600">Requested: Laptops, Monitors, Keyboards</div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium">Laboratory Equipment</div>
                <div className="text-sm text-gray-500">REQ-2024-003 • Science Department</div>
              </div>
              <div className="text-right">
                <div className="font-medium">$12,000</div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  Submitted
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600">Requested: Microscopes, Test Tubes, Chemical Sets</div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium">Furniture Request</div>
                <div className="text-sm text-gray-500">REQ-2024-004 • Administration</div>
              </div>
              <div className="text-right">
                <div className="font-medium">$3,200</div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                  Rejected
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600">Requested: Desks, Chairs, Filing Cabinets</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PurchaseOrdersTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Purchase Orders Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-4">
          <input 
            type="text" 
            placeholder="Search purchase orders..." 
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <select className="px-3 py-2 border rounded-md">
            <option>All Status</option>
            <option>Draft</option>
            <option>Sent</option>
            <option>Acknowledged</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>
        </div>
        <div className="space-y-3">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium">PO-2024-001</div>
                <div className="text-sm text-gray-500">Office Depot • REQ-2024-001</div>
              </div>
              <div className="text-right">
                <div className="font-medium">$1,200</div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800">
                  Completed
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Delivery: Dec 15, 2024</span>
              <span className="text-amber-600 font-medium">✓ Delivered</span>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium">PO-2024-002</div>
                <div className="text-sm text-gray-500">Tech Solutions Inc • REQ-2024-002</div>
              </div>
              <div className="text-right">
                <div className="font-medium">$5,500</div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  In Progress
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Expected: Dec 20, 2024</span>
              <span className="text-blue-600 font-medium">🚚 In Transit</span>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium">PO-2024-003</div>
                <div className="text-sm text-gray-500">Lab Equipment Co • REQ-2024-003</div>
              </div>
              <div className="text-right">
                <div className="font-medium">$12,000</div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                  Acknowledged
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Expected: Jan 10, 2025</span>
              <span className="text-yellow-600 font-medium">⏳ Processing</span>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium">PO-2024-004</div>
                <div className="text-sm text-gray-500">Office Furniture Plus • REQ-2024-005</div>
              </div>
              <div className="text-right">
                <div className="font-medium">$2,800</div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                  Draft
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Expected: TBD</span>
              <span className="text-gray-600 font-medium">📝 Draft</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingCard({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center h-32">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-gray-500">Loading...</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProcurementPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Suspense fallback={<div className="h-24 bg-gray-100 rounded-lg animate-pulse" />}>
        <ProcurementHeader />
      </Suspense>

      {/* Main Content */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="requisitions">Requisitions</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <Suspense fallback={<LoadingCard title="Dashboard" />}>
            <ProcurementDashboard />
          </Suspense>
        </TabsContent>

        {/* Requisitions Tab */}
        <TabsContent value="requisitions" className="space-y-6">
          <Suspense fallback={<LoadingCard title="Requisitions" />}>
            <RequisitionsTable />
          </Suspense>
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders" className="space-y-6">
          <Suspense fallback={<LoadingCard title="Purchase Orders" />}>
            <PurchaseOrdersTable />
          </Suspense>
        </TabsContent>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Vendor management functionality coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}