"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Pencil } from "lucide-react"

type PaymentDetails = {
  id: string
  studentId: string
  transactionType: string
  amount: number
  description: string
  reference: string
  paymentMethod: string
  receiptNumber: string
  bankReference: string
  journalEntryId: string
  processedBy: string
  processedById: string
  academicYear: string
  semester: string
  transactionDate: string
  createdAt: string
  updatedAt: string
  student: { id: string; name: string; studentNumber: string } | null
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0)
}

export default function PaymentViewPage() {
  const { toast } = useToast()
  const params = useParams<{ paymentId: string }>()
  const paymentId = String(params?.paymentId || "")

  const [loading, setLoading] = useState(true)
  const [payment, setPayment] = useState<PaymentDetails | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/finance/student-transactions/${encodeURIComponent(paymentId)}`, {
          cache: "no-store",
        })
        const body = await res.json().catch(() => null)
        if (!res.ok) {
          const message = body?.error || body?.message || `Failed to load payment (${res.status})`
          throw new Error(message)
        }
        setPayment(body?.data || null)
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load payment"
        toast({ title: "Error", description: message, variant: "destructive" })
        setPayment(null)
      } finally {
        setLoading(false)
      }
    }

    if (paymentId) load()
  }, [paymentId, toast])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/finance">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Finance
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payment Details</h1>
            <p className="text-muted-foreground">View a recorded student payment.</p>
          </div>
        </div>

        {payment?.id ? (
          <Button asChild>
            <Link href={`/finance/payments/${encodeURIComponent(payment.id)}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Payment</span>
            {payment?.transactionType ? <Badge variant="outline">{payment.transactionType}</Badge> : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-40 bg-gray-100 rounded-lg animate-pulse" />
          ) : payment ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Payment ID</div>
                <div className="font-medium break-all">{payment.id}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Amount</div>
                <div className="font-medium">{formatCurrency(payment.amount)}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Student</div>
                <div className="font-medium">{payment.student?.name || "Unknown"}</div>
                <div className="text-sm text-muted-foreground">{payment.student?.studentNumber || payment.studentId}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Payment Method</div>
                <div className="font-medium">{payment.paymentMethod || ""}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Academic Session</div>
                <div className="font-medium">{payment.academicYear || ""}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Semester</div>
                <div className="font-medium">{payment.semester || ""}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Transaction Date</div>
                <div className="font-medium">{payment.transactionDate || ""}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Receipt Number</div>
                <div className="font-medium">{payment.receiptNumber || ""}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Reference</div>
                <div className="font-medium break-all">{payment.reference || ""}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Bank Reference</div>
                <div className="font-medium break-all">{payment.bankReference || ""}</div>
              </div>

              <div className="md:col-span-2">
                <div className="text-sm text-muted-foreground">Description</div>
                <div className="font-medium">{payment.description || ""}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Processed By</div>
                <div className="font-medium">{payment.processedBy || "system"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Journal Entry</div>
                <div className="font-medium break-all">{payment.journalEntryId || ""}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Payment not found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
