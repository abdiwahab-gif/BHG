import { type NextRequest, NextResponse } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    // In real app, update requisition status in database
    console.log(`Reviewing requisition ${id}:`, body)

    const updatedRequisition = {
      id,
      status: body.status,
      reviewedBy: "Procurement Manager", // In real app, get from auth
      reviewedById: "proc-1",
      reviewDate: new Date().toISOString().split('T')[0],
      reviewComments: body.comments,
      ...(body.status === 'rejected' && { rejectionReason: body.rejectionReason }),
      ...(body.status === 'approved' && {
        approvedBy: "Procurement Manager",
        approvedById: "proc-1", 
        approvalDate: new Date().toISOString().split('T')[0],
        approvalComments: body.comments
      }),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      message: `Requisition ${body.status} successfully`,
      requisition: updatedRequisition
    })
  } catch (error) {
    console.error("Error reviewing requisition:", error)
    return NextResponse.json(
      { error: "Failed to review requisition" },
      { status: 500 }
    )
  }
}