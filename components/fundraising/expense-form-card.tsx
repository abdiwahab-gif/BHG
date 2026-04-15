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

const expenseSchema = z.object({
  amount: z.preprocess(
    (v) => {
      if (typeof v === "number") return v
      if (typeof v === "string") return Number.parseFloat(v)
      return v
    },
    z.number().finite().positive("Amount is required"),
  ),
  expenseType: z.string().trim().min(2, "Expense type is required").max(255),
})

export type ExpenseFormData = z.infer<typeof expenseSchema>

export type ExpenseFormCardProps = {
  expenseId?: string
  initialData?: Partial<ExpenseFormData>
  onSuccess?: () => void
  title?: string
  description?: string
  submitLabel?: string
}

export function ExpenseFormCard({
  expenseId,
  initialData,
  onSuccess,
  title,
  description,
  submitLabel,
}: ExpenseFormCardProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: 0,
      expenseType: "",
    },
  })

  useEffect(() => {
    reset({
      amount: typeof initialData?.amount === "number" ? initialData.amount : Number(initialData?.amount || 0),
      expenseType: initialData?.expenseType || "",
    })
  }, [reset, initialData?.amount, initialData?.expenseType])

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true)
    try {
      const isEditing = Boolean(expenseId)
      const url = isEditing ? `/api/expenses/${encodeURIComponent(String(expenseId))}` : "/api/expenses"

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
        toast({ title: isEditing ? "Update failed" : "Add expense failed", description: message, variant: "destructive" })
        return
      }

      toast({
        title: isEditing ? "Updated" : "Added",
        description: isEditing ? "Expense was updated." : "Expense was added.",
      })

      if (!isEditing) reset({ amount: 0, expenseType: "" })
      onSuccess?.()
    } catch {
      toast({
        title: expenseId ? "Update failed" : "Add expense failed",
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
        <CardTitle>{title || (expenseId ? "Edit Expense" : "Add Expense")}</CardTitle>
        <CardDescription>
          {description || (expenseId ? "Update expense details." : "Register an expense amount and type.")}
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
            <Label htmlFor="expenseType">Expense Type</Label>
            <Input
              id="expenseType"
              placeholder="e.g. Rent, Utilities, Transport"
              {...register("expenseType")}
              aria-invalid={!!errors.expenseType}
            />
            {errors.expenseType?.message && <p className="text-sm text-destructive">{errors.expenseType.message}</p>}
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
              submitLabel || (expenseId ? "Save Changes" : "Add Expense")
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
