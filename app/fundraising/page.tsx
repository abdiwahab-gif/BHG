"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, HandCoins, Home, MapPin, Briefcase, Users, Wallet } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { getAuthHeaders } from "@/lib/client-auth"
import { ScrollReveal } from "@/components/motion/scroll-reveal"

type FundraisingSummary = {
  success: boolean
  metrics: {
    membersTotal: number
    membersMaleTotal: number
    membersFemaleTotal: number
    donorsTotal: number
    donationsTotal: number
    incomeTotal: number
    expenseTotal: number
    balance: number
  }
  topDeggen: Array<{ name: string; total: number }>
  topJobs: Array<{ name: string; total: number }>
  series: Array<{ month: string; income: number; expense: number; balance: number }>
  error?: string
}

const currency = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function FundraisingDashboardPage() {
  const [data, setData] = useState<FundraisingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/fundraising/summary", {
          signal: controller.signal,
          headers: { ...getAuthHeaders() },
        })
        const payload = (await res.json().catch(() => null)) as FundraisingSummary | null
        if (!res.ok) throw new Error(payload?.error || `Failed to load summary (HTTP ${res.status})`)
        setData(payload)
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return
        setError(e instanceof Error ? e.message : "Failed to load summary")
      } finally {
        setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  const metrics = data?.metrics
  const series = useMemo(() => data?.series || [], [data?.series])
  const topDeggen = useMemo(() => data?.topDeggen || [], [data?.topDeggen])
  const topJobs = useMemo(() => data?.topJobs || [], [data?.topJobs])

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
              <span>Dashboard</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <HandCoins className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-sans text-balance">
                  Dashboard
                </h1>
                <p className="text-muted-foreground text-base sm:text-lg">Members, donors, income and expenses overview</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline">
                <Link href="/fundraising/incomes">
                  Income <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/fundraising/expenses">
                  Expenses <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/donations">
                  Donations <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/members">
                  Members <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 sm:px-6 py-8 space-y-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <ScrollReveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{loading ? "…" : String(metrics?.membersTotal ?? 0)}</div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Male Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{loading ? "…" : String(metrics?.membersMaleTotal ?? 0)}</div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Female Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{loading ? "…" : String(metrics?.membersFemaleTotal ?? 0)}</div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Donors</CardTitle>
              <HandCoins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{loading ? "…" : String(metrics?.donorsTotal ?? 0)}</div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{loading ? "…" : currency.format(metrics?.balance ?? 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Income {currency.format(metrics?.incomeTotal ?? 0)} − Expenses {currency.format(metrics?.expenseTotal ?? 0)}
              </p>
            </CardContent>
          </Card>
        </ScrollReveal>

        <div className="grid gap-4 lg:grid-cols-2">
          <ScrollReveal>
            <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Top Deggen</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : topDeggen.length === 0 ? (
                <div className="text-sm text-muted-foreground">No data yet.</div>
              ) : (
                <div className="space-y-2">
                  {topDeggen.map((row) => (
                    <div key={`${row.name}-${row.total}`} className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium truncate">{row.name || "—"}</div>
                      <div className="text-sm text-muted-foreground tabular-nums">{row.total}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal>
            <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Top Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : topJobs.length === 0 ? (
                <div className="text-sm text-muted-foreground">No data yet.</div>
              ) : (
                <div className="space-y-2">
                  {topJobs.map((row) => (
                    <div key={`${row.name}-${row.total}`} className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium truncate">{row.name || "—"}</div>
                      <div className="text-sm text-muted-foreground tabular-nums">{row.total}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            </Card>
          </ScrollReveal>
        </div>

        <ScrollReveal>
          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base">Income vs Expenses (last 6 months)</CardTitle>
            </CardHeader>
            <CardContent>
              {!mounted ? (
                <div className="h-[320px] w-full flex items-center justify-center text-sm text-muted-foreground">
                  Loading chart...
                </div>
              ) : (
                <ChartContainer
                  className="h-[320px] w-full"
                  config={{
                    income: { label: "Income", color: "hsl(var(--chart-1))" },
                    expense: { label: "Expenses", color: "hsl(var(--chart-2))" },
                  }}
                >
                  <BarChart data={series} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={56} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                    <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </motion.div>
  )
}
