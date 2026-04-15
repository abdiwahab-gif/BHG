"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { TeacherProfileClient } from "@/components/teachers/teacher-profile-client"

interface TeacherProfilePageProps {
  params: Promise<{ id: string }>
}

export default async function TeacherProfilePage({ params }: TeacherProfilePageProps) {
  const { id } = await params

  if (id === "add") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <Card>
            <CardHeader>
              <CardTitle>Invalid Route</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Please use the proper Add Teacher page.</p>
              <Button asChild>
                <Link href="/teachers/add">Go to Add Teacher</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return <TeacherProfileClient id={id} />
}
