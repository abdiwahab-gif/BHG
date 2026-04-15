"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DollarSign } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type DonationListItem = {
  id: string
  amount: number
  donorName?: string | null
  mobileNumber?: string | null
  email?: string | null
  note?: string | null
  status: string
  createdAt?: string
}

type DonationsListResponse = {
  success: boolean
  donations: DonationListItem[]
  pagination?: { page: number; limit: number; total: number; totalPages: number }
  error?: string
}

function formatMoney(amount: number) {
  if (!Number.isFinite(amount)) return String(amount)
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

export function DonationsTable() {
  const [status, setStatus] = useState<string>("all")
  const [donations, setDonations] = useState<DonationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDonations = async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (status !== "all") params.set("status", status)
      params.set("page", "1")
      params.set("limit", "200")

      const response = await fetch(`/api/donations?${params.toString()}`, { signal })
      const payload = (await response.json().catch(() => null)) as DonationsListResponse | null

      if (!response.ok) {
        throw new Error(payload?.error || `Failed to load donations (HTTP ${response.status})`)
      }

      setDonations(Array.isArray(payload?.donations) ? payload!.donations : [])
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return
      setError(e instanceof Error ? e.message : "Failed to load donations")
      setDonations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    void loadDonations(controller.signal)
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const headerCard = (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <CardTitle className="text-xl font-semibold">Donations</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/donate">
                <DollarSign className="h-4 w-4 mr-2" />
                New Donation
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="PLEDGED">PLEDGED</SelectItem>
              <SelectItem value="RECEIVED">RECEIVED</SelectItem>
              <SelectItem value="CANCELLED">CANCELLED</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        {headerCard}
        <Card>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Loading donations...
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        {headerCard}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-destructive">Error Loading Donations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {headerCard}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Donor</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No donations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  donations.map((donation) => (
                    <TableRow key={donation.id}>
                      <TableCell className="font-medium">{formatMoney(donation.amount)}</TableCell>
                      <TableCell>{donation.donorName || "—"}</TableCell>
                      <TableCell>{donation.mobileNumber || "—"}</TableCell>
                      <TableCell>{donation.email || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={donation.status === "RECEIVED" ? "default" : "secondary"}>{donation.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {donation.createdAt ? new Date(donation.createdAt).toLocaleString() : "—"}
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
