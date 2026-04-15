"use client"

import { MemberRegistrationFormCard } from "@/components/members/member-registration-form-card"

export default function MemberRegisterPage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto w-full max-w-lg">
        <MemberRegistrationFormCard />
      </div>
    </div>
  )
}
