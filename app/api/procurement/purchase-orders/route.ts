import { type NextRequest, NextResponse } from "next/server"
import type { PurchaseOrder, PurchaseOrderListResponse } from "@/types/procurement"

// Mock data - in real app, this would be in database
const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: "po-1",
    poNumber: "PO-2024-001",
    requisitionId: "req-2",
    requisition: {
      id: "req-2",
      requisitionNumber: "REQ-2024-002",
      requestingDepartment: "Biology",
      requestedBy: "Dr. Sarah Johnson",
      requestedById: "teacher-2",
      requestDate: "2024-09-18",
      items: [],
      totalEstimatedAmount: 12000,
      justification: "Current microscopes are over 10 years old",
      status: "approved",
      priority: "medium",
      createdAt: "2024-09-18T09:00:00Z",
      updatedAt: "2024-09-21T16:00:00Z"
    },
    vendorName: "Scientific Equipment Inc.",
    vendorContact: "John Vendor",
    vendorEmail: "john@scientific-eq.com",
    vendorPhone: "+1-555-0123",
    vendorAddress: "123 Science Ave, Tech City, TC 12345",
    items: [
      {
        id: "item-3",
        name: "Microscopes",
        description: "Digital microscopes for biology lab",
        quantity: 15,
        estimatedUnitPrice: 800,
        estimatedTotalPrice: 12000,
        category: "Lab Equipment",
        urgency: "medium",
        specifications: "1000x magnification, digital camera, USB connectivity"
      }
    ],
    subtotal: 12000,
    taxAmount: 960,
    totalAmount: 12960,
    status: "sent",
    paymentTerms: "Net 30 days",
    deliveryTerms: "FOB Destination",
    expectedDeliveryDate: "2024-11-01",
    createdBy: "Procurement Manager",
    createdById: "proc-1",
    createdDate: "2024-09-22",
    budgetApproved: true,
    budgetApprovedBy: "Finance Officer",
    budgetApprovedById: "finance-1",
    budgetApprovalDate: "2024-09-23",
    budgetComments: "Budget approved. Funds allocated from Lab Equipment budget.",
    invoiceReceived: false,
    paymentStatus: "pending",
    createdAt: "2024-09-22T10:00:00Z",
    updatedAt: "2024-09-23T14:00:00Z"
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const vendor = searchParams.get("vendor")
    const paymentStatus = searchParams.get("paymentStatus")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    let filteredPOs = [...mockPurchaseOrders]

    // Filter by status
    if (status && status !== "all") {
      filteredPOs = filteredPOs.filter(po => po.status === status)
    }

    // Filter by vendor
    if (vendor && vendor !== "all") {
      filteredPOs = filteredPOs.filter(po => po.vendorName.toLowerCase().includes(vendor.toLowerCase()))
    }

    // Filter by payment status
    if (paymentStatus && paymentStatus !== "all") {
      filteredPOs = filteredPOs.filter(po => po.paymentStatus === paymentStatus)
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredPOs = filteredPOs.filter(po =>
        po.poNumber.toLowerCase().includes(searchLower) ||
        po.vendorName.toLowerCase().includes(searchLower) ||
        po.requisition.requisitionNumber.toLowerCase().includes(searchLower)
      )
    }

    // Sort by creation date (newest first)
    filteredPOs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedPOs = filteredPOs.slice(startIndex, endIndex)

    const response: PurchaseOrderListResponse = {
      purchaseOrders: paginatedPOs,
      pagination: {
        page,
        limit,
        total: filteredPOs.length,
        totalPages: Math.ceil(filteredPOs.length / limit)
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching purchase orders:", error)
    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Generate PO number
    const poNumber = `PO-${new Date().getFullYear()}-${String(mockPurchaseOrders.length + 1).padStart(3, '0')}`
    
    // In real app, fetch requisition from database
    const mockRequisition = {
      id: body.requisitionId,
      requisitionNumber: "REQ-2024-XXX",
      requestingDepartment: "Sample Department",
      requestedBy: "Sample User",
      requestedById: "user-1",
      requestDate: new Date().toISOString().split('T')[0],
      items: [],
      totalEstimatedAmount: 0,
      justification: "Sample justification",
      status: "approved" as const,
      priority: "medium" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const subtotal = mockRequisition.totalEstimatedAmount
    const taxAmount = subtotal * 0.08 // 8% tax
    const totalAmount = subtotal + taxAmount

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber,
      requisitionId: body.requisitionId,
      requisition: mockRequisition,
      vendorName: body.vendorName,
      vendorContact: body.vendorContact,
      vendorEmail: body.vendorEmail,
      vendorPhone: body.vendorPhone,
      vendorAddress: body.vendorAddress,
      items: mockRequisition.items,
      subtotal,
      taxAmount,
      totalAmount,
      status: "draft",
      paymentTerms: body.paymentTerms,
      deliveryTerms: body.deliveryTerms,
      expectedDeliveryDate: body.expectedDeliveryDate,
      createdBy: "Procurement Manager", // In real app, get from auth
      createdById: "proc-1",
      createdDate: new Date().toISOString().split('T')[0],
      budgetApproved: false,
      invoiceReceived: false,
      paymentStatus: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // In real app, save to database
    mockPurchaseOrders.unshift(newPO)

    return NextResponse.json({
      success: true,
      message: "Purchase order created successfully",
      purchaseOrder: newPO
    })
  } catch (error) {
    console.error("Error creating purchase order:", error)
    return NextResponse.json(
      { error: "Failed to create purchase order" },
      { status: 500 }
    )
  }
}