import { type NextRequest, NextResponse } from "next/server"
import type { Requisition, RequisitionListResponse } from "@/types/procurement"

// Mock data - in real app, this would be in database
const mockRequisitions: Requisition[] = [
  {
    id: "req-1",
    requisitionNumber: "REQ-2024-001",
    requestingDepartment: "Computer Science",
    requestedBy: "Dr. John Smith",
    requestedById: "teacher-1",
    requestDate: "2024-09-20",
    items: [
      {
        id: "item-1",
        name: "Dell Laptops",
        description: "Dell Inspiron 15 3000 Series laptops for student lab",
        quantity: 20,
        estimatedUnitPrice: 650,
        estimatedTotalPrice: 13000,
        category: "Electronics",
        urgency: "medium",
        specifications: "Intel i5, 8GB RAM, 256GB SSD, Windows 11"
      },
      {
        id: "item-2", 
        name: "Network Switches",
        description: "24-port Gigabit managed switches for lab network",
        quantity: 2,
        estimatedUnitPrice: 300,
        estimatedTotalPrice: 600,
        category: "Network Equipment",
        urgency: "high",
        specifications: "24 x 1Gbps ports, managed, rack mountable"
      }
    ],
    totalEstimatedAmount: 13600,
    justification: "Required for new computer lab setup for 100 students. Current equipment is outdated and needs replacement to support modern programming courses.",
    status: "under_review",
    priority: "high",
    budgetCode: "CS-LAB-2024",
    expectedDeliveryDate: "2024-10-15",
    reviewedBy: "Procurement Manager",
    reviewedById: "proc-1",
    reviewDate: "2024-09-22",
    reviewComments: "Items appear reasonable. Checking with preferred vendors for pricing.",
    createdAt: "2024-09-20T10:00:00Z",
    updatedAt: "2024-09-22T14:30:00Z"
  },
  {
    id: "req-2",
    requisitionNumber: "REQ-2024-002",
    requestingDepartment: "Biology",
    requestedBy: "Dr. Sarah Johnson",
    requestedById: "teacher-2",
    requestDate: "2024-09-18",
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
    totalEstimatedAmount: 12000,
    justification: "Current microscopes are over 10 years old and lack digital capabilities needed for modern biology education.",
    status: "approved",
    priority: "medium",
    budgetCode: "BIO-LAB-2024",
    expectedDeliveryDate: "2024-11-01",
    reviewedBy: "Procurement Manager", 
    reviewedById: "proc-1",
    reviewDate: "2024-09-19",
    reviewComments: "Approved for purchase. Good vendor options available.",
    approvedBy: "Dr. Michael Chen",
    approvedById: "admin-1",
    approvalDate: "2024-09-21",
    approvalComments: "Approved. Essential for lab operations.",
    createdAt: "2024-09-18T09:00:00Z",
    updatedAt: "2024-09-21T16:00:00Z"
  },
  {
    id: "req-3",
    requisitionNumber: "REQ-2024-003",
    requestingDepartment: "Engineering",
    requestedBy: "Prof. Ahmed Hassan",
    requestedById: "teacher-3",
    requestDate: "2024-09-25",
    items: [
      {
        id: "item-4",
        name: "3D Printer",
        description: "Industrial grade 3D printer for engineering projects",
        quantity: 1,
        estimatedUnitPrice: 5000,
        estimatedTotalPrice: 5000,
        category: "Manufacturing Equipment",
        urgency: "low",
        specifications: "Large build volume, dual extruder, heated bed"
      }
    ],
    totalEstimatedAmount: 5000,
    justification: "Required for senior design projects and rapid prototyping in mechanical engineering courses.",
    status: "submitted",
    priority: "low",
    budgetCode: "ENG-PROJ-2024",
    expectedDeliveryDate: "2024-12-01",
    createdAt: "2024-09-25T11:00:00Z",
    updatedAt: "2024-09-25T11:00:00Z"
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const department = searchParams.get("department")
    const priority = searchParams.get("priority")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    let filteredRequisitions = [...mockRequisitions]

    // Filter by status
    if (status && status !== "all") {
      filteredRequisitions = filteredRequisitions.filter(req => req.status === status)
    }

    // Filter by department
    if (department && department !== "all") {
      filteredRequisitions = filteredRequisitions.filter(req => req.requestingDepartment === department)
    }

    // Filter by priority
    if (priority && priority !== "all") {
      filteredRequisitions = filteredRequisitions.filter(req => req.priority === priority)
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredRequisitions = filteredRequisitions.filter(req =>
        req.requisitionNumber.toLowerCase().includes(searchLower) ||
        req.requestedBy.toLowerCase().includes(searchLower) ||
        req.justification.toLowerCase().includes(searchLower) ||
        req.items.some(item => 
          item.name.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower)
        )
      )
    }

    // Sort by creation date (newest first)
    filteredRequisitions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedRequisitions = filteredRequisitions.slice(startIndex, endIndex)

    const response: RequisitionListResponse = {
      requisitions: paginatedRequisitions,
      pagination: {
        page,
        limit,
        total: filteredRequisitions.length,
        totalPages: Math.ceil(filteredRequisitions.length / limit)
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching requisitions:", error)
    return NextResponse.json(
      { error: "Failed to fetch requisitions" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Generate requisition number
    const reqNumber = `REQ-${new Date().getFullYear()}-${String(mockRequisitions.length + 1).padStart(3, '0')}`
    
    // Calculate total estimated amount
    const totalEstimatedAmount = body.items.reduce((sum: number, item: any) => 
      sum + (item.estimatedUnitPrice * item.quantity), 0
    )

    const newRequisition: Requisition = {
      id: `req-${Date.now()}`,
      requisitionNumber: reqNumber,
      requestingDepartment: body.requestingDepartment,
      requestedBy: "Current User", // In real app, get from auth
      requestedById: "user-current",
      requestDate: new Date().toISOString().split('T')[0],
      items: body.items.map((item: any, index: number) => ({
        id: `item-${Date.now()}-${index}`,
        ...item,
        estimatedTotalPrice: item.estimatedUnitPrice * item.quantity
      })),
      totalEstimatedAmount,
      justification: body.justification,
      status: "submitted",
      priority: body.priority,
      budgetCode: body.budgetCode,
      expectedDeliveryDate: body.expectedDeliveryDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // In real app, save to database
    mockRequisitions.unshift(newRequisition)

    return NextResponse.json({
      success: true,
      message: "Requisition created successfully",
      requisition: newRequisition
    })
  } catch (error) {
    console.error("Error creating requisition:", error)
    return NextResponse.json(
      { error: "Failed to create requisition" },
      { status: 500 }
    )
  }
}