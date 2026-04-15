"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, HandCoins, Home } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { IncomeFormCard, type IncomeFormData } from "@/components/fundraising/income-form-card"

type IncomeDetails = {
  id: string
  amount: number
  donorName: string
  createdAt: string
  updatedAt: string
}

type IncomeDetailsResponse = {
  success: boolean
  income: IncomeDetails | null
  error?: string
}

export default function EditIncomePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const incomeId = String(params?.id || "")

  const [income, setIncome] = useState<IncomeDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!incomeId) return
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/incomes/${encodeURIComponent(incomeId)}`, { signal: controller.signal })
        const payload = (await response.json().catch(() => null)) as IncomeDetailsResponse | null
        if (!response.ok) throw new Error(payload?.error || `Failed to load income (HTTP ${response.status})`)
        setIncome(payload?.income || null)
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return
        setError(e instanceof Error ? e.message : "Failed to load income")
        setIncome(null)
      } finally {
        setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [incomeId])

  const initialData: Partial<IncomeFormData> | undefined = income
    ? {
        amount: income.amount,
        donorName: income.donorName || "",
      }
    : undefined

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background"
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="border-b border-border bg-card/30 backdrop-blur-sm"
      >
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
                <Home className="h-4 w-4" />
                Home
              </Link>
              <span>/</span>
              <Link href="/fundraising" className="hover:text-foreground transition-colors">
                Fundraising
              </Link>
              <span>/</span>
              <Link href="/fundraising/incomes" className="hover:text-foreground transition-colors">
                Income
              </Link>
              <span>/</span>
              <span>Edit</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <HandCoins className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-sans text-balance">Edit Income</h1>
                <p className="text-muted-foreground text-base sm:text-lg">Update income details</p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="/fundraising/incomes">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <Card className="p-8">
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Loading income...
              </div>
            </div>
          </Card>
        ) : error ? (
          <Card className="p-8">
            <p className="text-muted-foreground">{error}</p>
          </Card>
        ) : !income ? (
          <Card className="p-8">
            <p className="text-muted-foreground">Income not found.</p>
          </Card>
        ) : (
          <div className="max-w-lg">
            <IncomeFormCard
              incomeId={incomeId}
              initialData={initialData}
              submitLabel="Save Changes"
              onSuccess={() => router.push("/fundraising/incomes")}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}
