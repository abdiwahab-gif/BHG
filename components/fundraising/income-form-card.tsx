"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { getAuthAndAuditHeaders } from "@/lib/client-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

const incomeSchema = z.object({
  amount: z.preprocess(
    (v) => {
      if (typeof v === "number") return v
      if (typeof v === "string") return Number.parseFloat(v)
      return v
    },
    z.number().finite().positive("Amount is required"),
  ),
  donorName: z.string().trim().max(255).optional().default(""),
})

export type IncomeFormData = z.infer<typeof incomeSchema>

export type IncomeFormCardProps = {
  incomeId?: string
  initialData?: Partial<IncomeFormData>
  onSuccess?: () => void
  title?: string
  description?: string
  submitLabel?: string
}

export function IncomeFormCard({
  incomeId,
  initialData,
  onSuccess,
  title,
  description,
  submitLabel,
}: IncomeFormCardProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      amount: 0,
      donorName: "",
    },
  })

  useEffect(() => {
    reset({
      amount: typeof initialData?.amount === "number" ? initialData.amount : Number(initialData?.amount || 0),
      donorName: initialData?.donorName || "",
    })
  }, [reset, initialData?.amount, initialData?.donorName])

  const onSubmit = async (data: IncomeFormData) => {
    setIsSubmitting(true)
    try {
      const isEditing = Boolean(incomeId)
      const url = isEditing ? `/api/incomes/${encodeURIComponent(String(incomeId))}` : "/api/incomes"

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...getAuthAndAuditHeaders() },
        body: JSON.stringify(data),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : typeof payload?.message === "string"
              ? payload.message
              : `Request failed (HTTP ${response.status})`
        toast({ title: isEditing ? "Update failed" : "Add income failed", description: message, variant: "destructive" })
        return
      }

      toast({
        title: isEditing ? "Updated" : "Added",
        description: isEditing ? "Income was updated." : "Income was added.",
      })

      if (!isEditing) reset({ amount: 0, donorName: "" })
      onSuccess?.()
    } catch {
      toast({
        title: incomeId ? "Update failed" : "Add income failed",
        description: "Could not connect to the server. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title || (incomeId ? "Edit Income" : "Add Income")}</CardTitle>
        <CardDescription>
          {description || (incomeId ? "Update income details." : "Register income amount and donor.")}
        </CardDescription>
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
              placeholder="0.00"
              {...register("amount", { valueAsNumber: true })}
              aria-invalid={!!errors.amount}
            />
            {errors.amount?.message && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="donorName">Donor</Label>
            <Input id="donorName" placeholder="Donor name" {...register("donorName")} aria-invalid={!!errors.donorName} />
            {errors.donorName?.message && <p className="text-sm text-destructive">{errors.donorName.message}</p>}
          </div>

          <p className="text-xs text-muted-foreground">Date & time are set automatically.</p>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              submitLabel || (incomeId ? "Save Changes" : "Add Income")
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
