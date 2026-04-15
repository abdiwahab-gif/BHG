"use client"

import { useRouter } from "next/navigation"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { DonationFormCard } from "@/components/donations/donation-form-card"

export default function DonateModal() {
  const router = useRouter()

  return (
    <Dialog open onOpenChange={(open) => (!open ? router.back() : null)}>
      <DialogContent className="max-w-lg p-0">
        <DonationFormCard onSuccess={() => router.back()} />
      </DialogContent>
    </Dialog>
  )
}
