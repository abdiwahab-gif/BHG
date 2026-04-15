"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { getAuthHeaders } from "@/lib/client-auth"

const donationSchema = z.object({
  amount: z.preprocess(
    (v) => {
      if (typeof v === "number") return v
      if (typeof v === "string") return Number.parseFloat(v)
      return v
    },
    z.number().finite().positive("Amount must be greater than 0"),
  ),
  donorName: z.string().optional().default(""),
  mobileNumber: z.string().optional().default(""),
  email: z.string().email("Invalid email").optional().or(z.literal("")).default(""),
  note: z.string().max(2000).optional().default(""),
})

export type DonationFormData = z.infer<typeof donationSchema>

export function DonationFormCard({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      amount: 0,
      donorName: "",
      mobileNumber: "",
      email: "",
      note: "",
    },
  })

  const onSubmit = async (data: DonationFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(data),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const message = typeof payload?.error === "string" ? payload.error : `Donation failed (HTTP ${response.status})`
        toast({ title: "Donation failed", description: message, variant: "destructive" })
        return
      }

      toast({ title: "Thank you!", description: "Your donation was submitted successfully." })
      reset({ amount: 0, donorName: "", mobileNumber: "", email: "", note: "" })
      onSuccess?.()
    } catch {
      toast({ title: "Donation failed", description: "Could not connect to the server.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Donate</CardTitle>
        <CardDescription>Support us by submitting a donation.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              placeholder="0"
              {...register("amount")}
              aria-invalid={!!errors.amount}
            />
            {errors.amount?.message && <p className="text-sm text-destructive">{String(errors.amount.message)}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="donorName">Name (optional)</Label>
            <Input id="donorName" placeholder="Your name" {...register("donorName")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobileNumber">Mobile Number (optional)</Label>
            <Input id="mobileNumber" placeholder="e.g. +252xxxxxxxx" {...register("mobileNumber")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...register("email")} aria-invalid={!!errors.email} />
            {errors.email?.message && <p className="text-sm text-destructive">{String(errors.email.message)}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Message (optional)</Label>
            <Textarea id="note" placeholder="Any note..." {...register("note")} />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Donate"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
