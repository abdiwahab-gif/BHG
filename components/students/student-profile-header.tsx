"use client"

import { motion } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Edit, Printer, Download } from "lucide-react"
import Link from "next/link"

interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  class: string
  section: string
  photo?: string
  status: "active" | "inactive" | "suspended"
  gender: "male" | "female" | "other"
  enrollmentDate: string
  studentId: string
  bloodType: string
  nationality: string
  religion: string
  address: string
  city: string
  zip: string
  fatherName: string
  motherName: string
  fatherPhone: string
  motherPhone: string
}

interface StudentProfileHeaderProps {
  student: Student
}

export function StudentProfileHeader({ student }: StudentProfileHeaderProps) {
  const getStatusBadge = (status: Student["status"]) => {
    const variants = {
      active: "default",
      inactive: "secondary",
      suspended: "destructive",
    } as const

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    )
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = () => {
    // This would typically generate and download a PDF
    console.log("Exporting PDF for student:", student.id)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Profile Image and Basic Info */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-center lg:items-start gap-4">
              <Avatar className="h-32 w-32">
                <AvatarImage
                  src={student.photo || "/placeholder.svg"}
                  alt={`${student.firstName} ${student.lastName}`}
                />
                <AvatarFallback className="text-2xl">
                  {student.firstName[0]}
                  {student.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="text-center lg:text-left">
                <h1 className="text-2xl font-bold text-foreground">
                  {student.firstName} {student.lastName}
                </h1>
                <p className="text-muted-foreground">Student ID: {student.studentId}</p>
                <div className="mt-2">{getStatusBadge(student.status)}</div>
              </div>
            </div>

            {/* Student Details */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Academic Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Class:</span>
                      <span className="font-medium">{student.class}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Section:</span>
                      <span className="font-medium">{student.section}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Enrollment Date:</span>
                      <span className="font-medium">{new Date(student.enrollmentDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Personal Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gender:</span>
                      <span className="font-medium capitalize">{student.gender}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Blood Type:</span>
                      <span className="font-medium">{student.bloodType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nationality:</span>
                      <span className="font-medium">{student.nationality}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Religion:</span>
                      <span className="font-medium capitalize">{student.religion}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Contact Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{student.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{student.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address:</span>
                      <span className="font-medium text-right">
                        {student.address}, {student.city} {student.zip}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Parent Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Father:</span>
                      <span className="font-medium">{student.fatherName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Father's Phone:</span>
                      <span className="font-medium">{student.fatherPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mother:</span>
                      <span className="font-medium">{student.motherName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mother's Phone:</span>
                      <span className="font-medium">{student.motherPhone}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 lg:w-auto w-full">
              <Button asChild className="w-full lg:w-auto">
                <Link href={`/students/${student.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
              <Button variant="outline" onClick={handlePrint} className="w-full lg:w-auto bg-transparent">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={handleExportPDF} className="w-full lg:w-auto bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
