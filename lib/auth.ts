export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  departmentId?: string
  permissions: Permission[]
  isActive: boolean
  lastLoginAt?: Date
  createdAt: Date
}

export type UserRole = "student" | "teacher" | "department_head" | "admin" | "super_admin"

export interface Permission {
  resource: string
  actions: string[]
}

export interface AuthContext {
  user: User | null
  isAuthenticated: boolean
  hasPermission: (resource: string, action: string) => boolean
  hasRole: (role: UserRole | UserRole[]) => boolean
}

// Role-based permissions configuration
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  student: [
    { resource: "exam_results", actions: ["read_own"] },
    { resource: "gpa", actions: ["read_own"] },
    { resource: "transcripts", actions: ["read_own", "export_own"] },
  ],
  teacher: [
    { resource: "exam_results", actions: ["read", "create", "update", "publish"] },
    { resource: "exam_types", actions: ["read"] },
    { resource: "grading_systems", actions: ["read"] },
    { resource: "students", actions: ["read"] },
    { resource: "courses", actions: ["read"] },
    { resource: "gpa", actions: ["read", "calculate"] },
    { resource: "audit_logs", actions: ["read_own"] },
  ],
  department_head: [
    { resource: "exam_results", actions: ["read", "create", "update", "delete", "publish", "unpublish"] },
    { resource: "exam_types", actions: ["read", "create", "update"] },
    { resource: "grading_systems", actions: ["read", "create", "update"] },
    { resource: "grade_mappings", actions: ["read", "create", "update", "delete"] },
    { resource: "students", actions: ["read"] },
    { resource: "teachers", actions: ["read"] },
    { resource: "courses", actions: ["read"] },
    { resource: "gpa", actions: ["read", "calculate", "recalculate"] },
    { resource: "transcripts", actions: ["read", "export", "generate"] },
    { resource: "audit_logs", actions: ["read"] },
    { resource: "analytics", actions: ["read"] },
  ],
  admin: [
    { resource: "exam_results", actions: ["read", "create", "update", "delete", "publish", "unpublish"] },
    { resource: "exam_types", actions: ["read", "create", "update", "delete"] },
    { resource: "grading_systems", actions: ["read", "create", "update", "delete"] },
    { resource: "grade_mappings", actions: ["read", "create", "update", "delete"] },
    { resource: "students", actions: ["read", "create", "update"] },
    { resource: "teachers", actions: ["read", "create", "update"] },
    { resource: "courses", actions: ["read", "create", "update"] },
    { resource: "gpa", actions: ["read", "calculate", "recalculate"] },
    { resource: "transcripts", actions: ["read", "export", "generate"] },
    { resource: "audit_logs", actions: ["read", "export"] },
    { resource: "analytics", actions: ["read", "export"] },
    { resource: "users", actions: ["read", "update"] },
  ],
  super_admin: [
    { resource: "*", actions: ["*"] }, // Full access to everything
  ],
}

export class AuthService {
  static hasPermission(user: User | null, resource: string, action: string): boolean {
    if (!user || !user.isActive) return false

    // Super admin has access to everything
    if (user.role === "super_admin") return true

    const rolePermissions = ROLE_PERMISSIONS[user.role] || []

    // Check for wildcard permissions
    const wildcardPermission = rolePermissions.find((p) => p.resource === "*")
    if (wildcardPermission && wildcardPermission.actions.includes("*")) return true

    // Check specific resource permissions
    const resourcePermission = rolePermissions.find((p) => p.resource === resource)
    if (!resourcePermission) return false

    return resourcePermission.actions.includes(action) || resourcePermission.actions.includes("*")
  }

  static hasRole(user: User | null, roles: UserRole | UserRole[]): boolean {
    if (!user || !user.isActive) return false

    const targetRoles = Array.isArray(roles) ? roles : [roles]
    return targetRoles.includes(user.role)
  }

  static canAccessStudentData(user: User | null, studentId: string): boolean {
    if (!user || !user.isActive) return false

    // Students can only access their own data
    if (user.role === "student") {
      return user.id === studentId
    }

    // Teachers, department heads, and admins can access student data
    return ["teacher", "department_head", "admin", "super_admin"].includes(user.role)
  }

  static canModifyExamResult(user: User | null, examResult: any): boolean {
    if (!user || !user.isActive) return false

    // Check basic permission
    if (!this.hasPermission(user, "exam_results", "update")) return false

    // Teachers can only modify results they entered
    if (user.role === "teacher") {
      return examResult.enteredBy === user.id
    }

    // Department heads and admins can modify any result
    return ["department_head", "admin", "super_admin"].includes(user.role)
  }
}
