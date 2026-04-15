"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Home, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MemberRegistrationFormCard, type MemberFormData } from "@/components/members/member-registration-form-card"
import { getAuthHeaders } from "@/lib/client-auth"

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
}

type MemberDetailsResponse = {
  success: boolean
  member: MemberDetails | null
  error?: string
}

export default function MemberEditPage({ params }: { params: { id: string } }) {
  const router = useRouter()
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
        const response = await fetch(`/api/members/${encodeURIComponent(memberId)}`, {
          signal: controller.signal,
          headers: { ...getAuthHeaders() },
        })
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

  const initialData: Partial<MemberFormData> | undefined = member
    ? {
        photo: member.photo || "",
        fullName: member.fullName,
        gender: member.gender || "",
        mobileNumber: member.mobileNumber,
        email: member.email,
        deggen: member.deggen,
        shaqada: member.shaqada,
        masuulkaaga: member.masuulkaaga,
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
              <Link href="/members" className="hover:text-foreground transition-colors">
                Members
              </Link>
              <span>/</span>
              <span>Edit</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-sans text-balance">Edit Member</h1>
                <p className="text-muted-foreground text-base sm:text-lg">Update member registration details</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href={`/members/${encodeURIComponent(memberId)}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <Card className="p-8">
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Loading member...
              </div>
            </div>
          </Card>
        ) : error ? (
          <Card className="p-8">
            <p className="text-muted-foreground">{error}</p>
          </Card>
        ) : !member ? (
          <Card className="p-8">
            <p className="text-muted-foreground">Member not found.</p>
          </Card>
        ) : (
          <div className="max-w-lg">
            <MemberRegistrationFormCard
              memberId={memberId}
              initialData={initialData}
              submitLabel="Save Changes"
              onSuccess={() => router.push(`/members/${encodeURIComponent(memberId)}`)}
              title="Edit Member"
              description="Update the member details below."
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}
