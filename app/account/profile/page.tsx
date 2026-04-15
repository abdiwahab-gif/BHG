'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Shield, LogOut, Lock, Smartphone } from 'lucide-react'
import { motion } from 'framer-motion'

interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: string
  status: string
  twoFactorEnabled: boolean
  lastLoginDate?: string
  createdAt: string
}

export default function UserProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const token = localStorage.getItem('token')

      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`${apiUrl}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch profile')
      }

      const data = await response.json()
      setUser(data.data)
      setFormData({
        firstName: data.data.firstName,
        lastName: data.data.lastName,
        phone: data.data.phone || '',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const token = localStorage.getItem('token')

      const response = await fetch(`${apiUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.data)
        setIsEditing(false)
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        })
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to update profile',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const token = localStorage.getItem('token')

      const response = await fetch(`${apiUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
        setIsChangingPassword(false)
        toast({
          title: 'Success',
          description: 'Password changed successfully',
        })
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to change password',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to change password',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Failed to load profile</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-6 h-6" />
                User Profile
              </CardTitle>
              <CardDescription>View and manage your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600 text-sm">Role</Label>
                  <p className="font-semibold text-gray-900 capitalize">{user.role}</p>
                </div>
                <div>
                  <Label className="text-gray-600 text-sm">Status</Label>
                  <p className="font-semibold text-gray-900 capitalize">{user.status}</p>
                </div>
                <div>
                  <Label className="text-gray-600 text-sm">Email</Label>
                  <p className="font-semibold text-gray-900">{user.email}</p>
                </div>
                {user.lastLoginDate && (
                  <div>
                    <Label className="text-gray-600 text-sm">Last Login</Label>
                    <p className="font-semibold text-gray-900">
                      {new Date(user.lastLoginDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Profile Edit Section */}
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full">
                  Edit Profile
                </Button>
              ) : (
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSaving} className="flex-1">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Save Changes
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-6 h-6" />
                Security
              </CardTitle>
              <CardDescription>Manage your password and 2FA settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isChangingPassword ? (
                <Button
                  onClick={() => setIsChangingPassword(true)}
                  variant="outline"
                  className="w-full flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Change Password
                </Button>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      required
                      placeholder="Min 12 chars, uppercase, lowercase, number, special char"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Must contain: uppercase, lowercase, number, and special character (!@#$%^&*)
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSaving} className="flex-1">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Update Password
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsChangingPassword(false)}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {/* 2FA Status */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-semibold">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-600">
                        {user.twoFactorEnabled ? 'Enabled' : 'Not enabled'}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push('/account/security')}
                    variant="outline"
                    size="sm"
                  >
                    Configure
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
