import { type NextRequest, NextResponse } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    // In real app, update purchase order budget approval in database
    console.log(`Budget approval for PO ${id}:`, body)

    const updatedPO = {
      id,
      budgetApproved: body.approved,
      budgetApprovedBy: "Finance Officer", // In real app, get from auth
      budgetApprovedById: "finance-1",
      budgetApprovalDate: new Date().toISOString().split('T')[0],
      budgetComments: body.comments,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      message: `Budget ${body.approved ? 'approved' : 'rejected'} successfully`,
      purchaseOrder: updatedPO
    })
  } catch (error) {
    console.error("Error processing budget approval:", error)
    return NextResponse.json(
      { error: "Failed to process budget approval" },
      { status: 500 }
    )
  }
}