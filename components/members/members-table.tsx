"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Eye, Edit, Plus, Search, Trash2 } from "lucide-react"

import { getAuthAndAuditHeaders, getAuthHeaders } from "@/lib/client-auth"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

type MemberListItem = {
  id: string
  fullName: string
  mobileNumber: string
  email: string
  deggen: string
  shaqada: string
  masuulkaaga: string
  photo?: string | null
  createdAt?: string
  updatedAt?: string
}

type MembersListResponse = {
  success: boolean
  members: MemberListItem[]
  pagination?: { page: number; limit: number; total: number; totalPages: number }
  error?: string
}

function initialsFromName(name: string): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
  return initials || "M"
}

export function MembersTable() {
  const [searchQuery, setSearchQuery] = useState("")
  const [location, setLocation] = useState("all")
  const [members, setMembers] = useState<MemberListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadMembers = async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) params.set("search", searchQuery.trim())
      if (location !== "all") params.set("location", location)
      params.set("page", "1")
      params.set("limit", "200")

      const response = await fetch(`/api/members?${params.toString()}`, { signal, headers: { ...getAuthHeaders() } })
      const payload = (await response.json().catch(() => null)) as MembersListResponse | null

      if (!response.ok) {
        throw new Error(payload?.error || `Failed to load members (HTTP ${response.status})`)
      }

      setMembers(Array.isArray(payload?.members) ? payload!.members : [])
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return
      setError(e instanceof Error ? e.message : "Failed to load members")
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setActionError(null)
    setDeletingId(id)
    try {
      const response = await fetch(`/api/members/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          ...getAuthAndAuditHeaders(),
        },
      })
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        throw new Error(payload?.error || `Failed to delete member (HTTP ${response.status})`)
      }
      setMembers((prev) => prev.filter((m) => m.id !== id))
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to delete member")
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    const t = setTimeout(() => {
      void loadMembers(controller.signal)
    }, 250)

    return () => {
      controller.abort()
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, location])

  const headerCard = (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <CardTitle className="text-xl font-semibold">Members</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/members/register">
                <Plus className="h-4 w-4 mr-2" />
                Register Member
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search members by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="w-full sm:w-[220px]">
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                <SelectItem value="Borama">Borama</SelectItem>
                <SelectItem value="Wajaale">Wajaale</SelectItem>
                <SelectItem value="Hargeisa">Hargeisa</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {actionError ? <p className="mt-3 text-sm text-destructive">{actionError}</p> : null}
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
                Loading members...
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
            <CardTitle className="text-xl font-semibold text-destructive">Error Loading Members</CardTitle>
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
                  <TableHead className="w-[56px]">Photo</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => {
                    const initials = initialsFromName(member.fullName)
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={member.photo || "/placeholder.svg"} alt={member.fullName} />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{member.fullName}</TableCell>
                        <TableCell>{member.mobileNumber}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button asChild variant="ghost" size="icon">
                              <Link href={`/members/${encodeURIComponent(member.id)}`} aria-label="View member">
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button asChild variant="ghost" size="icon">
                              <Link href={`/members/${encodeURIComponent(member.id)}/edit`} aria-label="Edit member">
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Delete member"
                                  disabled={deletingId === member.id}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete member?</AlertDialogTitle>
                                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel disabled={deletingId === member.id}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    disabled={deletingId === member.id}
                                    onClick={() => void handleDelete(member.id)}
                                  >
                                    {deletingId === member.id ? "Deleting..." : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
