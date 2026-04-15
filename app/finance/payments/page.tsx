"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Eye, Pencil } from "lucide-react"

type PaymentListItem = {
  id: string
  studentId: string
  amount: number
  description: string
  paymentMethod: string
  academicYear: string
  semester: string
  transactionDate: string
  processedBy: string
  student: { name: string; studentNumber: string }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0)
}

export default function FinancePaymentsPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()

  const studentId = String(searchParams.get("studentId") || "").trim()

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<PaymentListItem[]>([])

  const title = useMemo(() => {
    return studentId ? "Student Payments" : "Payments"
  }, [studentId])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)

        const qp = new URLSearchParams()
        if (studentId) qp.set("studentId", studentId)
        qp.set("limit", "50")

        const res = await fetch(`/api/finance/student-transactions?${qp.toString()}`, { cache: "no-store" })
        const body = await res.json().catch(() => null)
        if (!res.ok) {
          const message = body?.error || body?.message || `Failed to load payments (${res.status})`
          throw new Error(message)
        }

        const list = Array.isArray(body?.data?.items) ? body.data.items : []
        setItems(list)
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load payments"
        toast({ title: "Error", description: message, variant: "destructive" })
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [studentId, toast])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>View and edit recorded student payments.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          ) : items.length ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Processed By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.transactionDate || ""}</TableCell>
                      <TableCell>
                        <div className="font-medium">{p.student?.name || ""}</div>
                        <div className="text-xs text-muted-foreground">{p.student?.studentNumber || p.studentId}</div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell>
                      <TableCell>
                        {p.paymentMethod ? <Badge variant="outline">{p.paymentMethod}</Badge> : ""}
                      </TableCell>
                      <TableCell>{p.academicYear || ""}</TableCell>
                      <TableCell>{p.semester || ""}</TableCell>
                      <TableCell>{p.processedBy || "system"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/finance/payments/${encodeURIComponent(p.id)}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                        <Button size="sm" asChild>
                          <Link href={`/finance/payments/${encodeURIComponent(p.id)}/edit`}>
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No payments found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
