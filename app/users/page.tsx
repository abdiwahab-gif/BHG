"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Search, Edit2, Trash2, Users } from "lucide-react"
import { clearAuthSession, getAuthToken } from "@/lib/session-client"

interface User {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
}

export default function UsersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const token = getAuthToken()
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {}
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search: searchQuery,
        role: roleFilter,
        status: statusFilter,
      })

      const response = await fetch(`/api/users?${params}`, { headers: authHeader })
      if (response.status === 401 || response.status === 403) {
        clearAuthSession()
        router.push("/login")
        return
      }
      const data = await response.json()

      if (data.success) {
        setUsers(data.data.users)
        setTotalPages(data.data.totalPages)
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to fetch users",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, searchQuery, roleFilter, statusFilter])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return

    try {
      const token = getAuthToken()
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {}
      const response = await fetch(`/api/users/${id}`, { method: "DELETE", headers: authHeader })
      if (response.status === 401 || response.status === 403) {
        clearAuthSession()
        router.push("/login")
        return
      }
      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "User deleted successfully",
        })
        fetchUsers()
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to delete user",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-800",
      super_admin: "bg-purple-100 text-purple-800",
      teacher: "bg-blue-100 text-blue-800",
      student: "bg-green-100 text-green-800",
      department_head: "bg-orange-100 text-orange-800",
    }
    return colors[role] || "bg-gray-100 text-gray-800"
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin"
      case "super_admin":
        return "Super Admin"
      case "teacher":
        return "Volunteer"
      case "student":
        return "Member"
      case "department_head":
        return "Coordinator"
      default:
        return String(role || "").replaceAll("_", " ")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="w-8 h-8" />
              User Management
            </h1>
            <p className="text-gray-600 mt-1">Manage system users and their permissions</p>
          </div>
          <Button onClick={() => router.push("/users/add")} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Add New User
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setPage(1)
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Role</label>
                <Select value={roleFilter} onValueChange={(value) => {
                  setRoleFilter(value)
                  setPage(1)
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="teacher">Volunteer</SelectItem>
                    <SelectItem value="student">Member</SelectItem>
                    <SelectItem value="department_head">Coordinator</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={(value) => {
                  setStatusFilter(value)
                  setPage(1)
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">&nbsp;</label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("")
                    setRoleFilter("all")
                    setStatusFilter("all")
                    setPage(1)
                  }}
                  className="w-full"
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Users List</CardTitle>
            <CardDescription>View and manage all system users</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.role)}>{getRoleLabel(user.role)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/users/${user.id}/edit`)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(user.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
