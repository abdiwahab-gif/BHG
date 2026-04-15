import { type NextRequest, NextResponse } from "next/server"
import type { ProcurementStats } from "@/types/procurement"

export async function GET(request: NextRequest) {
  try {
    // In real app, calculate from database
    const stats: ProcurementStats = {
      totalRequisitions: 12,
      pendingRequisitions: 5,
      approvedRequisitions: 7,
      totalPurchaseOrders: 4,
      pendingPayments: 2,
      totalProcurementValue: 45600,
      departmentBreakdown: [
        { department: "Computer Science", count: 3, amount: 18600 },
        { department: "Biology", count: 2, amount: 15000 },
        { department: "Engineering", count: 4, amount: 8000 },
        { department: "Chemistry", count: 2, amount: 3500 },
        { department: "Physics", count: 1, amount: 500 }
      ],
      monthlyTrends: [
        { month: "Jan", requisitions: 2, amount: 5000 },
        { month: "Feb", requisitions: 1, amount: 3000 },
        { month: "Mar", requisitions: 3, amount: 8000 },
        { month: "Apr", requisitions: 2, amount: 6000 },
        { month: "May", requisitions: 1, amount: 2000 },
        { month: "Jun", requisitions: 2, amount: 7000 },
        { month: "Jul", requisitions: 0, amount: 0 },
        { month: "Aug", requisitions: 1, amount: 4600 },
        { month: "Sep", requisitions: 3, amount: 10000 }
      ]
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching procurement stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch procurement statistics" },
      { status: 500 }
    )
  }
}