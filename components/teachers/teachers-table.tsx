"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, Edit, Trash2, Mail, Phone, MapPin, Award, Calendar, Download, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTeachers, useDeleteTeacher } from "@/hooks/use-teachers"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface TeachersTableProps {
  searchQuery?: string
  genderFilter?: string
  statusFilter?: string
}

export function TeachersTable({ searchQuery = "", genderFilter = "all", statusFilter = "all" }: TeachersTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sortBy, setSortBy] = useState<"name" | "email" | "joiningDate">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const router = useRouter()
  const deleteTeacherMutation = useDeleteTeacher()

  // Build filters for API call
  const filters = useMemo(
    () => ({
      page: currentPage,
      limit: itemsPerPage,
      search: searchQuery,
      gender: genderFilter === "all" ? "" : genderFilter,
      status: statusFilter === "all" ? "" : statusFilter,
    }),
    [currentPage, itemsPerPage, searchQuery, genderFilter, statusFilter],
  )

  const { data, isLoading, error } = useTeachers(filters)

  const handleSort = (column: "name" | "email" | "joiningDate") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  const handleDeleteTeacher = async (teacherId: string) => {
    try {
      await deleteTeacherMutation.mutateAsync(teacherId)
    } catch (error) {
      console.error("Error deleting teacher:", error)
    }
  }

  const handleRowClick = (teacherId: string) => {
    router.push(`/teachers/${teacherId}`)
  }

  const exportToCSV = () => {
    if (!data?.teachers) return

    const headers = ["Name", "Email", "Phone", "Gender", "Subjects", "Experience", "Status"]
    const csvContent = [
      headers.join(","),
      ...data.teachers.map((teacher) =>
        [
          `"${teacher.firstName} ${teacher.lastName}"`,
          teacher.email,
          teacher.phone,
          teacher.gender,
          `"${teacher.subjects?.join(", ") || ""}"`,
          teacher.experience || "",
          teacher.status,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "teachers.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Teachers List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Loading teachers...
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Users className="h-5 w-5" />
            Error Loading Teachers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load teachers. Please try again later.</p>
        </CardContent>
      </Card>
    )
  }

  const teachers = data?.teachers || []
  const pagination = data?.pagination

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Teachers List
              </CardTitle>
              <CardDescription>
                {pagination
                  ? `Showing ${teachers.length} of ${pagination.totalItems} teachers`
                  : "Manage teacher information"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No teachers found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || genderFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by adding your first teacher"}
              </p>
              <Button asChild>
                <Link href="/teachers/add">
                  <Users className="h-4 w-4 mr-2" />
                  Add Teacher
                </Link>
              </Button>
            </motion.div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>
                        <Button variant="ghost" className="h-auto p-0 font-semibold" onClick={() => handleSort("name")}>
                          Teacher
                          {sortBy === "name" && <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold"
                          onClick={() => handleSort("email")}
                        >
                          Contact
                          {sortBy === "email" && <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>}
                        </Button>
                      </TableHead>
                      <TableHead>Subjects</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold"
                          onClick={() => handleSort("joiningDate")}
                        >
                          Joined
                          {sortBy === "joiningDate" && <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>}
                        </Button>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {teachers.map((teacher, index) => (
                        <motion.tr
                          key={teacher.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleRowClick(teacher.id)}
                        >
                          <TableCell className="font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={teacher.photo || "/placeholder.svg"}
                                  alt={`${teacher.firstName} ${teacher.lastName}`}
                                />
                                <AvatarFallback>
                                  {teacher.firstName.charAt(0)}
                                  {teacher.lastName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {teacher.firstName} {teacher.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {teacher.city}, {teacher.nationality}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                {teacher.email}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {teacher.phone}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {teacher.subjects?.slice(0, 2).map((subject, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {subject}
                                </Badge>
                              ))}
                              {teacher.subjects && teacher.subjects.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{teacher.subjects.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Award className="h-3 w-3" />
                              {teacher.experience || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={teacher.status === "Active" ? "default" : "secondary"}>
                              {teacher.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {/* View Teacher */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/teachers/${teacher.id}`)
                                }}
                                className="text-blue-600 hover:text-blue-800"
                                title="View Profile"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              {/* Edit Teacher */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/teachers/${teacher.id}/edit`)
                                }}
                                className="text-amber-600 hover:text-amber-800"
                                title="Edit Teacher"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              {/* Delete Teacher */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-red-600 hover:text-red-800"
                                    title="Delete Teacher"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete {teacher.firstName} {teacher.lastName}? This
                                      action cannot be undone and will remove all associated records.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteTeacher(teacher.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-between mt-6"
                >
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, pagination.totalItems)} of {pagination.totalItems} teachers
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={!pagination.hasPreviousPage}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const pageNumber = Math.max(1, currentPage - 2) + i
                        if (pageNumber > pagination.totalPages) return null
                        return (
                          <Button
                            key={pageNumber}
                            variant={pageNumber === currentPage ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(pageNumber)}
                          >
                            {pageNumber}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={!pagination.hasNextPage}
                    >
                      Next
                    </Button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
