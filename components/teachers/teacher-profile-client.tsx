"use client"

import { motion } from "framer-motion"
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  BookOpen,
  DollarSign,
  User,
  Globe,
  MoreVertical,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTeacher, useDeleteTeacher } from "@/hooks/use-teachers"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface TeacherProfileClientProps {
  id: string
}

export function TeacherProfileClient({ id }: TeacherProfileClientProps) {
  const router = useRouter()
  const { data, isLoading, error } = useTeacher(id)
  const deleteTeacher = useDeleteTeacher()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDelete = async () => {
    try {
      await deleteTeacher.mutateAsync(id)
      router.push("/teachers")
    } catch (error) {
      console.error("Failed to delete teacher:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Loading teacher profile...
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data?.teacher) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Teacher Not Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                The teacher you're looking for doesn't exist or has been removed.
              </p>
              <Button asChild>
                <Link href="/teachers">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Teachers
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const teacher = data.teacher

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="border-b border-border bg-card/30 backdrop-blur-sm"
      >
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex items-center gap-4"
            >
              <Button asChild variant="ghost" size="sm" className="flex items-center gap-2">
                <Link href="/teachers">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Teachers
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 font-sans text-balance">
                  {teacher.firstName} {teacher.lastName}
                </h1>
                <p className="text-muted-foreground text-base">Teacher Profile & Information</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex items-center gap-2"
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/teachers/${id}/edit`} className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Edit Teacher
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Teacher
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="lg:col-span-1"
          >
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Avatar className="h-32 w-32">
                    <AvatarImage
                      src={teacher.photo || "/placeholder.svg"}
                      alt={`${teacher.firstName} ${teacher.lastName}`}
                    />
                    <AvatarFallback className="text-2xl">
                      {teacher.firstName.charAt(0)}
                      {teacher.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-xl">
                  {teacher.firstName} {teacher.lastName}
                </CardTitle>
                <CardDescription className="flex items-center justify-center gap-1">
                  <User className="h-4 w-4" />
                  Teacher
                </CardDescription>
                <div className="flex justify-center mt-2">
                  <Badge variant={teacher.status === "Active" ? "default" : "secondary"}>{teacher.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{teacher.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{teacher.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {teacher.city}, {teacher.nationality}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>{teacher.nationality}</span>
                </div>
                {teacher.joiningDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Joined {new Date(teacher.joiningDate).toLocaleDateString()}</span>
                  </div>
                )}
                {teacher.experience && (
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <span>{teacher.experience} experience</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Details Cards */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                    <p className="text-sm mt-1">
                      {teacher.firstName} {teacher.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Gender</label>
                    <p className="text-sm mt-1">{teacher.gender}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm mt-1">{teacher.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="text-sm mt-1">{teacher.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nationality</label>
                    <p className="text-sm mt-1">{teacher.nationality}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <Badge variant={teacher.status === "Active" ? "default" : "secondary"}>{teacher.status}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="text-sm mt-1">{teacher.address}</p>
                    {teacher.address2 && <p className="text-sm text-muted-foreground">{teacher.address2}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">City</label>
                    <p className="text-sm mt-1">{teacher.city}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ZIP Code</label>
                    <p className="text-sm mt-1">{teacher.zip}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Professional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Subjects */}
                {teacher.subjects && teacher.subjects.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Subjects</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {teacher.subjects.map((subject, index) => (
                        <Badge key={index} variant="secondary">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Qualifications */}
                {teacher.qualifications && teacher.qualifications.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Qualifications</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {teacher.qualifications.map((qualification, index) => (
                        <Badge key={index} variant="outline">
                          {qualification}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {teacher.experience && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        Experience
                      </label>
                      <p className="text-sm mt-1">{teacher.experience}</p>
                    </div>
                  )}
                  {teacher.joiningDate && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Joining Date
                      </label>
                      <p className="text-sm mt-1">{new Date(teacher.joiningDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  {teacher.salary && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Salary
                      </label>
                      <p className="text-sm mt-1">${teacher.salary.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {teacher?.firstName} {teacher?.lastName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTeacher.isPending}
            >
              {deleteTeacher.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
