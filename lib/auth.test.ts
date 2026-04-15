import { describe, expect, it } from "vitest"
import { AuthService, ROLE_PERMISSIONS, type User, type UserRole } from "./auth"

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u-1",
    email: "test@academic.edu",
    name: "Test User",
    role: "admin",
    permissions: [],
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  }
}

describe("AuthService suite: role and permission model", () => {
  describe("ROLE_PERMISSIONS integrity", () => {
    it("has a permission mapping for every supported role", () => {
      const roles: UserRole[] = ["student", "teacher", "department_head", "admin", "super_admin"]

      for (const role of roles) {
        expect(ROLE_PERMISSIONS[role]).toBeDefined()
        expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true)
      }
    })

    it("gives super_admin wildcard access", () => {
      const superAdminPermissions = ROLE_PERMISSIONS.super_admin

      expect(superAdminPermissions.some((p) => p.resource === "*" && p.actions.includes("*"))).toBe(true)
    })
  })

  describe("hasPermission()", () => {
    it("returns false for null user", () => {
      expect(AuthService.hasPermission(null, "exam_results", "read")).toBe(false)
    })

    it("returns false for inactive user", () => {
      const user = makeUser({ isActive: false })
      expect(AuthService.hasPermission(user, "exam_results", "read")).toBe(false)
    })

    it("returns true for exact resource/action on role", () => {
      const teacher = makeUser({ role: "teacher" })
      expect(AuthService.hasPermission(teacher, "exam_results", "update")).toBe(true)
    })

    it("returns false for unknown resource", () => {
      const admin = makeUser({ role: "admin" })
      expect(AuthService.hasPermission(admin, "non_existing_resource", "read")).toBe(false)
    })

    it("returns false for known resource but unauthorized action", () => {
      const teacher = makeUser({ role: "teacher" })
      expect(AuthService.hasPermission(teacher, "exam_results", "delete")).toBe(false)
    })

    it("returns true for wildcard role access", () => {
      const superAdmin = makeUser({ role: "super_admin" })
      expect(AuthService.hasPermission(superAdmin, "anything", "any_action")).toBe(true)
    })

    it("keeps action matching case-sensitive", () => {
      const teacher = makeUser({ role: "teacher" })
      expect(AuthService.hasPermission(teacher, "exam_results", "READ")).toBe(false)
      expect(AuthService.hasPermission(teacher, "exam_results", "read")).toBe(true)
    })

    it("enforces read_own semantics at permission level (student does not have generic read)", () => {
      const student = makeUser({ role: "student" })
      expect(AuthService.hasPermission(student, "exam_results", "read_own")).toBe(true)
      expect(AuthService.hasPermission(student, "exam_results", "read")).toBe(false)
    })
  })

  describe("hasRole()", () => {
    it("returns false for null user", () => {
      expect(AuthService.hasRole(null, "admin")).toBe(false)
    })

    it("returns false for inactive user", () => {
      const user = makeUser({ isActive: false, role: "admin" })
      expect(AuthService.hasRole(user, "admin")).toBe(false)
    })

    it("returns true when single role matches", () => {
      const admin = makeUser({ role: "admin" })
      expect(AuthService.hasRole(admin, "admin")).toBe(true)
    })

    it("returns false when single role does not match", () => {
      const admin = makeUser({ role: "admin" })
      expect(AuthService.hasRole(admin, "teacher")).toBe(false)
    })

    it("returns true when multi-role list contains user role", () => {
      const departmentHead = makeUser({ role: "department_head" })
      expect(AuthService.hasRole(departmentHead, ["teacher", "department_head"])).toBe(true)
    })

    it("returns false when multi-role list does not contain user role", () => {
      const student = makeUser({ role: "student" })
      expect(AuthService.hasRole(student, ["teacher", "admin"])).toBe(false)
    })
  })

  describe("canAccessStudentData()", () => {
    it("allows student to access own data", () => {
      const student = makeUser({ id: "s-1", role: "student" })
      expect(AuthService.canAccessStudentData(student, "s-1")).toBe(true)
    })

    it("blocks student from accessing others' data", () => {
      const student = makeUser({ id: "s-1", role: "student" })
      expect(AuthService.canAccessStudentData(student, "s-2")).toBe(false)
    })

    it("allows teacher/department_head/admin/super_admin to access student data", () => {
      expect(AuthService.canAccessStudentData(makeUser({ role: "teacher" }), "s-1")).toBe(true)
      expect(AuthService.canAccessStudentData(makeUser({ role: "department_head" }), "s-1")).toBe(true)
      expect(AuthService.canAccessStudentData(makeUser({ role: "admin" }), "s-1")).toBe(true)
      expect(AuthService.canAccessStudentData(makeUser({ role: "super_admin" }), "s-1")).toBe(true)
    })

    it("blocks inactive users regardless of role", () => {
      const inactiveAdmin = makeUser({ role: "admin", isActive: false })
      expect(AuthService.canAccessStudentData(inactiveAdmin, "s-1")).toBe(false)
    })
  })

  describe("canModifyExamResult()", () => {
    const ownResult = { enteredBy: "t-1" }
    const otherResult = { enteredBy: "t-2" }

    it("blocks null and inactive users", () => {
      expect(AuthService.canModifyExamResult(null, ownResult)).toBe(false)

      const inactiveTeacher = makeUser({ role: "teacher", isActive: false })
      expect(AuthService.canModifyExamResult(inactiveTeacher, ownResult)).toBe(false)
    })

    it("blocks users without update permission", () => {
      const student = makeUser({ role: "student" })
      expect(AuthService.canModifyExamResult(student, ownResult)).toBe(false)
    })

    it("allows teacher to modify only own entered result", () => {
      const teacher = makeUser({ id: "t-1", role: "teacher" })
      expect(AuthService.canModifyExamResult(teacher, ownResult)).toBe(true)
      expect(AuthService.canModifyExamResult(teacher, otherResult)).toBe(false)
    })

    it("allows department_head/admin/super_admin to modify any result", () => {
      expect(AuthService.canModifyExamResult(makeUser({ role: "department_head" }), otherResult)).toBe(true)
      expect(AuthService.canModifyExamResult(makeUser({ role: "admin" }), otherResult)).toBe(true)
      expect(AuthService.canModifyExamResult(makeUser({ role: "super_admin" }), otherResult)).toBe(true)
    })

    it("handles malformed examResult object without throwing", () => {
      const teacher = makeUser({ id: "t-1", role: "teacher" })
      expect(() => AuthService.canModifyExamResult(teacher, {})).not.toThrow()
      expect(AuthService.canModifyExamResult(teacher, {})).toBe(false)
    })
  })
})
