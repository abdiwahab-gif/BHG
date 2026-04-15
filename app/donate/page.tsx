"use client"

import { DonationFormCard } from "@/components/donations/donation-form-card"

export default function DonatePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <DonationFormCard />
      </div>
    </div>
  )
}
