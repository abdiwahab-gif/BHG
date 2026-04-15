"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getAuditHeaders } from "@/lib/client-audit"
import { ArrowLeft, Save } from "lucide-react"

type PaymentDetails = {
  id: string
  amount: number
  description: string
  reference: string
  paymentMethod: string
  receiptNumber: string
  bankReference: string
  academicYear: string
  semester: string
  transactionDate: string
  student: { name: string; studentNumber: string } | null
}

const paymentMethods = ["CASH", "CHECK", "BANK_TRANSFER", "CREDIT_CARD", "MOBILE_MONEY", "ONLINE"] as const

type PaymentMethod = (typeof paymentMethods)[number]

export default function PaymentEditPage() {
  const { toast } = useToast()
  const router = useRouter()
  const params = useParams<{ paymentId: string }>()
  const paymentId = String(params?.paymentId || "")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [payment, setPayment] = useState<PaymentDetails | null>(null)

  const [description, setDescription] = useState("")
  const [reference, setReference] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("")
  const [receiptNumber, setReceiptNumber] = useState("")
  const [bankReference, setBankReference] = useState("")
  const [academicYear, setAcademicYear] = useState("")
  const [semester, setSemester] = useState("")
  const [transactionDate, setTransactionDate] = useState("")

  const canSave = useMemo(() => {
    return Boolean(paymentId && description.trim() && paymentMethod && transactionDate)
  }, [paymentId, description, paymentMethod, transactionDate])

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

        const data = body?.data || null
        setPayment(data)
        setDescription(String(data?.description || ""))
        setReference(String(data?.reference || ""))
        setPaymentMethod((String(data?.paymentMethod || "") as PaymentMethod) || "")
        setReceiptNumber(String(data?.receiptNumber || ""))
        setBankReference(String(data?.bankReference || ""))
        setAcademicYear(String(data?.academicYear || ""))
        setSemester(String(data?.semester || ""))
        setTransactionDate(String(data?.transactionDate || ""))
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

  const save = async () => {
    if (!canSave || saving) return

    try {
      setSaving(true)
      const res = await fetch(`/api/finance/student-transactions/${encodeURIComponent(paymentId)}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          ...getAuditHeaders(),
        },
        body: JSON.stringify({
          description: description.trim(),
          reference: reference.trim(),
          paymentMethod: paymentMethod || undefined,
          receiptNumber: receiptNumber.trim(),
          bankReference: bankReference.trim(),
          academicYear: academicYear.trim(),
          semester: semester.trim(),
          transactionDate: transactionDate.trim(),
        }),
      })

      const body = await res.json().catch(() => null)
      if (!res.ok) {
        const message = body?.error || body?.message || `Failed to save (${res.status})`
        throw new Error(message)
      }

      toast({ title: "Saved", description: "Payment updated" })
      router.push(`/finance/payments/${encodeURIComponent(paymentId)}`)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save payment"
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/finance/payments/${encodeURIComponent(paymentId)}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Payment
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Payment</h1>
          <p className="text-muted-foreground">
            Edit payment metadata (amount and GL posting are not editable here).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-56 bg-gray-100 rounded-lg animate-pulse" />
          ) : payment ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Student</Label>
                  <div className="text-sm text-muted-foreground">
                    {payment.student?.name || "Unknown"} ({payment.student?.studentNumber || ""})
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Amount (read-only)</Label>
                  <Input value={String(payment.amount || 0)} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod || ""} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Transaction Date</Label>
                  <Input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Academic Session</Label>
                  <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="e.g. 2024-2025" />
                </div>
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Input value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="e.g. Fall" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Reference</Label>
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Bank Reference</Label>
                  <Input value={bankReference} onChange={(e) => setBankReference(e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Receipt Number</Label>
                  <Input value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} />
                </div>
                <div className="space-y-2" />
              </div>

              <div className="flex justify-end">
                <Button onClick={save} disabled={!canSave || saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
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
