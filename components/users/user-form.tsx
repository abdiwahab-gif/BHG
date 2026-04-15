"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, X, AlertCircle, CheckCircle2 } from "lucide-react"
import { validatePasswordPolicy } from "@/lib/password-policy"
import { Switch } from "@/components/ui/switch"
import { getAuthToken } from "@/lib/session-client"

interface UserFormProps {
  user?: {
    id: string
    email: string
    name: string
    role: string
    isActive: boolean
  }
  onSuccess?: () => void
}

interface ValidationErrors {
  email?: string
  name?: string
  password?: string
  confirmPassword?: string
  role?: string
}

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
  { value: "department_head", label: "Department Head" },
  { value: "super_admin", label: "Super Admin" },
]

// Validation functions
function validateEmail(email: string): string | null {
  if (!email || !email.trim()) {
    return "Email is required"
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return "Please enter a valid email address"
  }

  return null
}

function validateName(name: string): string | null {
  if (!name || !name.trim()) {
    return "Name is required"
  }

  if (name.trim().length < 2) {
    return "Name must be at least 2 characters"
  }

  if (name.length > 255) {
    return "Name is too long (max 255 characters)"
  }

  return null
}

function validatePassword(password: string, isNewUser: boolean): string | null {
  if (isNewUser && (!password || !password.trim())) {
    return "Password is required"
  }

  if (password) {
    const result = validatePasswordPolicy(password)
    if (!result.isValid) {
      return result.errors[0] || "Password does not meet the policy"
    }
  }

  return null
}

function validateRole(role: string): string | null {
  const validRoles = ["admin", "student", "teacher", "department_head", "super_admin"]
  
  if (!role) {
    return "Role is required"
  }

  if (!validRoles.includes(role)) {
    return "Invalid role selected"
  }

  return null
}

export function UserForm({ user, onSuccess }: UserFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [sendInviteEmail, setSendInviteEmail] = useState(!user)
  const [formData, setFormData] = useState({
    email: user?.email || "",
    name: user?.name || "",
    password: "",
    confirmPassword: "",
    role: user?.role || "student",
    isActive: user?.isActive ?? true,
  })

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error for this field when user starts typing
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {}

    // Validate email
    const emailError = validateEmail(formData.email)
    if (emailError) errors.email = emailError

    // Validate name
    const nameError = validateName(formData.name)
    if (nameError) errors.name = nameError

    // Validate role
    const roleError = validateRole(formData.role)
    if (roleError) errors.role = roleError

    // Validate password only when not using invite flow
    const needsPassword = Boolean(user) || !sendInviteEmail
    const passwordError = validatePassword(formData.password, !user && needsPassword)
    if (passwordError) errors.password = passwordError

    // Validate password confirmation if a password is being set
    if (formData.password) {
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Passwords do not match"
      }
    } else if (!user && needsPassword) {
      errors.password = "Password is required"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors below",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const token = getAuthToken()
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {}

      // New user invite flow
      if (!user && sendInviteEmail) {
        const response = await fetch("/api/auth/invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({
            email: formData.email.trim(),
            name: formData.name.trim(),
            role: formData.role,
          }),
        })

        let data: any = null
        try {
          data = await response.json()
        } catch {
          data = null
        }

        if (response.ok) {
          toast({
            title: "Invitation Sent",
            description: "A registration link was sent to the user's email.",
          })
          setTimeout(() => {
            router.push("/users")
            if (onSuccess) onSuccess()
          }, 500)
          return
        }

        if (response.status === 409) {
          setValidationErrors((prev) => ({
            ...prev,
            email: data?.message || "Email already exists. Please use a different email.",
          }))
        }

        toast({
          title: "Error",
          description: data?.message || "Failed to send invitation",
          variant: "destructive",
        })
        return
      }

      const url = user ? `/api/users/${user.id}` : "/api/users"
      const method = user ? "PUT" : "POST"

      const payload: any = {
        email: formData.email.trim(),
        name: formData.name.trim(),
        role: formData.role,
        isActive: formData.isActive,
      }

      if (formData.password) {
        payload.password = formData.password
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(payload),
      })

      let data: any = null
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (response.ok) {
        toast({
          title: "Success",
          description: user ? "User updated successfully" : "User created successfully",
        })
        setTimeout(() => {
          router.push("/users")
          if (onSuccess) onSuccess()
        }, 500)
      } else {
        if (response.status === 409) {
          setValidationErrors((prev) => ({
            ...prev,
            email: data?.message || "Email already exists. Please use a different email.",
          }))
        }

        if (response.status === 400 && typeof data?.message === "string") {
          const msg = data.message
          if (msg.toLowerCase().includes("email")) {
            setValidationErrors((prev) => ({ ...prev, email: msg }))
          } else if (msg.toLowerCase().includes("name")) {
            setValidationErrors((prev) => ({ ...prev, name: msg }))
          } else if (msg.toLowerCase().includes("role")) {
            setValidationErrors((prev) => ({ ...prev, role: msg }))
          } else if (msg.toLowerCase().includes("password")) {
            setValidationErrors((prev) => ({ ...prev, password: msg }))
          }
        }

        toast({
          title: "Error",
          description: data?.message || "Failed to save user",
          variant: "destructive",
        })
      }
    } catch (error) {
      const isOffline = typeof navigator !== "undefined" && navigator && navigator.onLine === false
      toast({
        title: "Error",
        description: isOffline ? "You appear to be offline. Turn off Offline mode and try again." : "Failed to save user",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>{user ? "Edit User" : "Add New User"}</CardTitle>
          <CardDescription>
            {user ? "Update user information and permissions" : "Create a new system user account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Basic Information</h3>

              {!user && (
                <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Send registration email link</p>
                    <p className="text-xs text-muted-foreground">
                      User sets their own password via an invite link.
                    </p>
                  </div>
                  <Switch
                    checked={sendInviteEmail}
                    onCheckedChange={(checked) => setSendInviteEmail(Boolean(checked))}
                    disabled={isLoading}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    Email *
                    {!validationErrors.email && formData.email && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@academic.edu"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    disabled={isLoading}
                    className={validationErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {validationErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    Full Name *
                    {!validationErrors.name && formData.name && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    disabled={isLoading}
                    className={validationErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {validationErrors.name && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {validationErrors.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role" className="flex items-center gap-2">
                    Role *
                    {!validationErrors.role && formData.role && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </Label>
                  <Select value={formData.role} onValueChange={(value) => handleChange("role", value)}>
                    <SelectTrigger disabled={isLoading} className={validationErrors.role ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.role && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {validationErrors.role}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.isActive ? "active" : "inactive"}
                    onValueChange={(value) => handleChange("isActive", value === "active")}
                  >
                    <SelectTrigger disabled={isLoading}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Password Section */}
            {(user || !sendInviteEmail) && (
              <div className="space-y-4">
                <h3 className="font-semibold">{user ? "Change Password (Optional)" : "Password"}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center gap-2">
                      Password {!user && "*"}
                      {!validationErrors.password && formData.password && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder={user ? "Leave blank to keep current" : "Min 12 chars: upper, lower, number, special"}
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      disabled={isLoading}
                      className={validationErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {validationErrors.password && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {validationErrors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                      Confirm Password {!user && "*"}
                      {!validationErrors.confirmPassword &&
                        formData.confirmPassword &&
                        formData.password === formData.confirmPassword && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder={user ? "Leave blank to keep current" : "Confirm password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange("confirmPassword", e.target.value)}
                      disabled={isLoading}
                      className={validationErrors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {validationErrors.confirmPassword && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {validationErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/users")}
                disabled={isLoading}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {user ? "Update User" : "Create User"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
