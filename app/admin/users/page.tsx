'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'
import {
  Loader2,
  Search,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Users,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  phone?: string
  twoFactorEnabled: boolean
  lastLoginDate?: string
  createdAt: string
}

interface UserFormData {
  email: string
  firstName: string
  lastName: string
  password: string
  role: 'admin' | 'teacher' | 'student' | 'parent' | 'staff'
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    role: 'student',
  })

  useEffect(() => {
    fetchUsers()
  }, [searchQuery, roleFilter, statusFilter])

  const fetchUsers = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const token = localStorage.getItem('token')

      if (!token) {
        router.push('/login')
        return
      }

      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (roleFilter !== 'all') params.append('role', roleFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`${apiUrl}/api/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data.data || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const token = localStorage.getItem('token')

      const response = await fetch(`${apiUrl}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'User created successfully',
        })
        setShowForm(false)
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
          password: '',
          role: 'student',
        })
        fetchUsers()
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to create user',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create user',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}?`)) return

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const token = localStorage.getItem('token')

      const response = await fetch(`${apiUrl}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'User deleted successfully',
        })
        fetchUsers()
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete user',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      })
    }
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      teacher: 'bg-blue-100 text-blue-800',
      student: 'bg-green-100 text-green-800',
      parent: 'bg-purple-100 text-purple-800',
      staff: 'bg-yellow-100 text-yellow-800',
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: string) => {
    return status === 'active'
      ? 'text-green-600'
      : status === 'suspended'
        ? 'text-red-600'
        : 'text-gray-600'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-8 h-8" />
                User Management
              </h1>
              <p className="text-gray-600 mt-1">Manage system users and permissions</p>
            </div>
            <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add User
            </Button>
          </div>

          {/* Add User Form */}
          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>Create New User</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role *</Label>
                      <select
                        id="role"
                        value={formData.role}
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value as any })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                        <option value="parent">Parent</option>
                        <option value="staff">Staff</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Min 12 chars: uppercase, lowercase, number, special char"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-gray-600" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-600" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Password must contain: uppercase, lowercase, number, and special character
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={isSaving} className="flex-1">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Create User
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="search">Search Users</Label>
                  <Input
                    id="search"
                    placeholder="Name, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="role-filter">Role</Label>
                  <select
                    id="role-filter"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                    <option value="parent">Parent</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : users.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No users found</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">2FA</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50 transition">
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{user.email}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(
                                user.role
                              )}`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-medium capitalize ${getStatusColor(user.status)}`}
                            >
                              {user.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {user.twoFactorEnabled ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <Lock className="w-4 h-4" />
                                Enabled
                              </span>
                            ) : (
                              <span className="text-gray-400">Disabled</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/admin/users/${user.id}/edit`)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  )
}
