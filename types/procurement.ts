export interface ProcurementItem {
  id: string
  name: string
  description: string
  quantity: number
  estimatedUnitPrice: number
  estimatedTotalPrice: number
  category: string
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  specifications?: string
}

export interface Requisition {
  id: string
  requisitionNumber: string
  requestingDepartment: string
  requestedBy: string
  requestedById: string
  requestDate: string
  items: ProcurementItem[]
  totalEstimatedAmount: number
  justification: string
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  budgetCode?: string
  expectedDeliveryDate?: string
  
  // Approval workflow
  reviewedBy?: string
  reviewedById?: string
  reviewDate?: string
  reviewComments?: string
  approvedBy?: string
  approvedById?: string
  approvalDate?: string
  approvalComments?: string
  rejectionReason?: string
  
  createdAt: string
  updatedAt: string
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  requisitionId: string
  requisition: Requisition
  vendorName: string
  vendorContact: string
  vendorEmail: string
  vendorPhone: string
  vendorAddress: string
  
  items: ProcurementItem[]
  subtotal: number
  taxAmount: number
  totalAmount: number
  
  status: 'draft' | 'sent' | 'acknowledged' | 'in_progress' | 'completed' | 'cancelled'
  paymentTerms: string
  deliveryTerms: string
  expectedDeliveryDate: string
  actualDeliveryDate?: string
  
  createdBy: string
  createdById: string
  createdDate: string
  
  // Finance oversight
  budgetApproved: boolean
  budgetApprovedBy?: string
  budgetApprovedById?: string
  budgetApprovalDate?: string
  budgetComments?: string
  
  invoiceReceived: boolean
  invoiceNumber?: string
  invoiceDate?: string
  paymentStatus: 'pending' | 'partial' | 'completed'
  paymentDate?: string
  
  createdAt: string
  updatedAt: string
}

export interface Vendor {
  id: string
  name: string
  contact: string
  email: string
  phone: string
  address: string
  category: string[]
  rating: number
  status: 'active' | 'inactive'
  createdAt: string
}

export interface RequisitionFilters {
  status?: string
  department?: string
  requestedBy?: string
  priority?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  limit?: number
}

export interface PurchaseOrderFilters {
  status?: string
  vendor?: string
  dateFrom?: string
  dateTo?: string
  paymentStatus?: string
  search?: string
  page?: number
  limit?: number
}

export interface RequisitionListResponse {
  requisitions: Requisition[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface PurchaseOrderListResponse {
  purchaseOrders: PurchaseOrder[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateRequisitionRequest {
  requestingDepartment: string
  items: Omit<ProcurementItem, 'id'>[]
  justification: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  budgetCode?: string
  expectedDeliveryDate?: string
}

export interface CreatePurchaseOrderRequest {
  requisitionId: string
  vendorName: string
  vendorContact: string
  vendorEmail: string
  vendorPhone: string
  vendorAddress: string
  paymentTerms: string
  deliveryTerms: string
  expectedDeliveryDate: string
}

export interface ReviewRequisitionRequest {
  status: 'approved' | 'rejected'
  comments: string
  rejectionReason?: string
}

export interface BudgetApprovalRequest {
  approved: boolean
  comments: string
}

export interface ProcurementStats {
  totalRequisitions: number
  pendingRequisitions: number
  approvedRequisitions: number
  totalPurchaseOrders: number
  pendingPayments: number
  totalProcurementValue: number
  departmentBreakdown: { department: string; count: number; amount: number }[]
  monthlyTrends: { month: string; requisitions: number; amount: number }[]
}