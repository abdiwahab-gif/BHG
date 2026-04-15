"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Edit, Plus, Trash2 } from "lucide-react"

import { getAuthAndAuditHeaders, getAuthHeaders } from "@/lib/client-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type IncomeListItem = {
  id: string
  amount: number
  donorName: string
  createdAt: string
  updatedAt: string
}

type IncomesListResponse = {
  success: boolean
  incomes: IncomeListItem[]
  error?: string
}

const currency = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function IncomesTable() {
  const [items, setItems] = useState<IncomeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/incomes?page=1&limit=200", { signal, headers: { ...getAuthHeaders() } })
      const payload = (await res.json().catch(() => null)) as IncomesListResponse | null
      if (!res.ok) throw new Error(payload?.error || `Failed to load incomes (HTTP ${res.status})`)
      setItems(Array.isArray(payload?.incomes) ? payload!.incomes : [])
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return
      setError(e instanceof Error ? e.message : "Failed to load incomes")
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [])

  const deleteIncome = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/incomes/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { ...getAuthAndAuditHeaders() },
      })
      const payload = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) throw new Error(payload?.error || `Failed to delete (HTTP ${res.status})`)
      setItems((prev) => prev.filter((x) => x.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete income")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-xl font-semibold">Income</CardTitle>
          <Button asChild>
            <Link href="/fundraising/incomes/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Income
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-0">
          {error ? <p className="p-4 text-sm text-destructive">{error}</p> : null}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Donor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No income records.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">{row.createdAt ? format(new Date(row.createdAt), "PPP p") : ""}</TableCell>
                      <TableCell className="max-w-[280px] truncate">{row.donorName || ""}</TableCell>
                      <TableCell className="text-right tabular-nums">{currency.format(row.amount || 0)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="ghost" size="icon" aria-label="Edit income">
                            <Link href={`/fundraising/incomes/${encodeURIComponent(row.id)}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Delete income" disabled={deletingId === row.id}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete income?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={deletingId === row.id}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  disabled={deletingId === row.id}
                                  onClick={() => void deleteIncome(row.id)}
                                >
                                  {deletingId === row.id ? "Deleting..." : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
