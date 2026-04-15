"use client"

import { useRouter } from "next/navigation"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { MemberRegistrationFormCard } from "@/components/members/member-registration-form-card"

export default function MemberRegistrationModal() {
  const router = useRouter()

  return (
    <Dialog open onOpenChange={(open) => (!open ? router.back() : null)}>
      <DialogContent className="max-w-lg p-0 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain">
        <MemberRegistrationFormCard onSuccess={() => router.back()} />
      </DialogContent>
    </Dialog>
  )
}
