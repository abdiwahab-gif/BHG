"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Edit, Home, Users } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type MemberDetails = {
  id: string
  fullName: string
  gender?: string
  mobileNumber: string
  email: string
  deggen: string
  shaqada: string
  masuulkaaga: string
  photo?: string | null
  createdAt?: string
  updatedAt?: string
}

type MemberDetailsResponse = {
  success: boolean
  member: MemberDetails | null
  error?: string
}

function initialsFromName(name: string): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
  return initials || "M"
}

export default function MemberViewPage({ params }: { params: { id: string } }) {
  const memberId = String(params?.id || "")
  const [member, setMember] = useState<MemberDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!memberId) return
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/members/${encodeURIComponent(memberId)}`, { signal: controller.signal })
        const payload = (await response.json().catch(() => null)) as MemberDetailsResponse | null
        if (!response.ok) {
          throw new Error(payload?.error || `Failed to load member (HTTP ${response.status})`)
        }
        setMember(payload?.member || null)
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return
        setError(e instanceof Error ? e.message : "Failed to load member")
        setMember(null)
      } finally {
        setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [memberId])

  const initials = useMemo(() => initialsFromName(member?.fullName || ""), [member?.fullName])

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
              <Link href="/members" className="hover:text-foreground transition-colors">
                Members
              </Link>
              <span>/</span>
              <span>View</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-sans text-balance">Member Details</h1>
                <p className="text-muted-foreground text-base sm:text-lg">View member registration details</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/members">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/members/${encodeURIComponent(memberId)}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Loading member...
                </div>
              </div>
            ) : error ? (
              <p className="text-muted-foreground">{error}</p>
            ) : !member ? (
              <p className="text-muted-foreground">Member not found.</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-[200px_1fr]">
                <div className="flex flex-col items-center gap-3">
                  <Avatar className="h-28 w-28">
                    <AvatarImage src={member.photo || "/placeholder.svg"} alt={member.fullName} />
                    <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <div className="font-semibold text-foreground">{member.fullName}</div>
                    <div className="text-sm text-muted-foreground">{member.email}</div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Mobile</div>
                    <div className="font-medium">{member.mobileNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Gender</div>
                    <div className="font-medium">{member.gender ? String(member.gender).toUpperCase() : "—"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Deggan</div>
                    <div className="font-medium">{member.deggen}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Shaqada</div>
                    <div className="font-medium">{member.shaqada}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Masuulkaaga</div>
                    <div className="font-medium">{member.masuulkaaga}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Created</div>
                    <div className="font-medium">{member.createdAt ? new Date(member.createdAt).toLocaleString() : "—"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Updated</div>
                    <div className="font-medium">{member.updatedAt ? new Date(member.updatedAt).toLocaleString() : "—"}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
