"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useNoticeStats } from "@/hooks/use-notices"
import { Bell, FileText, AlertTriangle, Archive } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export function NoticeStats() {
  const { stats, loading, error } = useNoticeStats()

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Failed to load notice statistics
          </p>
        </CardContent>
      </Card>
    )
  }

  const statItems = [
    {
      title: "Total Notices",
      value: stats.total,
      description: `+${stats.thisMonth} this month`,
      icon: Bell,
      color: "text-blue-600"
    },
    {
      title: "Published",
      value: stats.published,
      description: "Active notices",
      icon: FileText,
      color: "text-amber-600"
    },
    {
      title: "Urgent",
      value: stats.urgent,
      description: "Require attention",
      icon: AlertTriangle,
      color: "text-red-600"
    },
    {
      title: "Drafts",
      value: stats.draft,
      description: "Pending publication",
      icon: Archive,
      color: "text-yellow-600"
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {item.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}