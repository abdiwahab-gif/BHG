import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login - Academic Management System",
  description: "Sign in to access the academic management system",
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
