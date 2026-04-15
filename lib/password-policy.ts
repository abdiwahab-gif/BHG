export interface PasswordPolicyResult {
  isValid: boolean
  errors: string[]
}

const MIN_LENGTH = 12
const MAX_LENGTH = 128

function containsCommonPatterns(password: string): boolean {
  const commonPatterns: RegExp[] = [
    /^(123|abc|qwerty|password|12345)/i,
    /(.)\1{2,}/, // Three or more repeated characters
    /^[A-Za-z0-9]{1,5}$/, // Too simple (only 1-5 chars of one type)
  ]

  return commonPatterns.some((pattern) => pattern.test(password))
}

/**
 * Mirrors the strong password policy used by the Express backend.
 */
export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const errors: string[] = []

  if (password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters long`)
  } else if (password.length > MAX_LENGTH) {
    errors.push(`Password must not exceed ${MAX_LENGTH} characters`)
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter (A-Z)")
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter (a-z)")
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number (0-9)")
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&*)")
  }

  if (containsCommonPatterns(password)) {
    errors.push("Password contains common patterns that are too predictable")
  }

  return { isValid: errors.length === 0, errors }
}
