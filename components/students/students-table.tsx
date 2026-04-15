"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Eye, Edit, Trash2, Search, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useStudents } from "@/hooks/use-students"
import { useClasses } from "@/hooks/use-classes"
import { updateStudents } from "@/lib/api/students"
import { BulkActions } from "./bulk-actions"
import { ExportDialog } from "./export-dialog"
import { AdvancedSearch } from "./advanced-search"
import { exportStudentsData } from "@/lib/utils/export"
import type { Student, StudentFilters } from "@/lib/api/students"

interface StudentsTableProps {
  students?: Student[]
  onEdit?: (student: Student) => void
  onDelete?: (studentId: string) => void
  onView?: (student: Student) => void
}

export function StudentsTable({ students = [], onEdit, onDelete, onView }: StudentsTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [sectionFilter, setSectionFilter] = useState("all")
  const [genderFilter, setGenderFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const { toast } = useToast()
  const { data: classesData } = useClasses()

  // Server-side list/pagination (Teachers-style)
  const itemsPerPage = 10
  const studentsQuery = useStudents({ page: 1, limit: itemsPerPage })
  const apiStudents = studentsQuery.students
  const pagination = studentsQuery.pagination
  const isLoading = studentsQuery.loading
  const error = studentsQuery.error

  const classOptions = useMemo(() => {
    const names = (classesData || []).map((c: any) => String(c.name)).filter(Boolean)
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  }, [classesData])

  const sectionOptions = useMemo(() => {
    const allSections = (classesData || []).flatMap((c: any) => (c.sections || []).map((s: any) => String(s.name)))
    if (classFilter !== "all") {
      const selected = (classesData || []).find((c: any) => String(c.name) === String(classFilter))
      const selectedSections = (selected?.sections || []).map((s: any) => String(s.name))
      return Array.from(new Set(selectedSections.filter(Boolean))).sort((a, b) => a.localeCompare(b))
    }
    return Array.from(new Set(allSections.filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [classesData, classFilter])

  useEffect(() => {
    const timeout = setTimeout(() => {
      studentsQuery.updateFilters({
        search: searchQuery || undefined,
        class: classFilter !== "all" ? classFilter : undefined,
        section: sectionFilter !== "all" ? sectionFilter : undefined,
        gender: genderFilter !== "all" ? genderFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        limit: itemsPerPage,
      })
    }, 250)

    return () => clearTimeout(timeout)
  }, [searchQuery, classFilter, sectionFilter, genderFilter, statusFilter, itemsPerPage])

  const displayedStudents = apiStudents
  const totalPages = pagination.totalPages || 1
  const currentPage = pagination.page || 1

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(displayedStudents.map((student) => student.id))
    } else {
      setSelectedStudents([])
    }
  }

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents((prev) => [...prev, studentId])
    } else {
      setSelectedStudents((prev) => prev.filter((id) => id !== studentId))
    }
  }

  const handleDelete = (studentId: string) => {
    void studentsQuery.handleDeleteStudent(studentId)
  }

  const handleBulkDelete = async (ids: string[]) => {
    await studentsQuery.handleDeleteStudents(ids)
    setSelectedStudents([])
  }

  const handleBulkStatusUpdate = async (ids: string[], status: string) => {
    await updateStudents(ids, { status: status as any })
    toast({ title: "Status Updated", description: `${ids.length} students status updated to ${status}.` })
    setSelectedStudents([])
    studentsQuery.refresh()
  }

  const handleExport = async (format: string, fields: string[], filters?: StudentFilters) => {
    try {
      await exportStudentsData(displayedStudents, format, fields)
    } catch (error) {
      throw new Error("Failed to export data")
    }
  }

  const handleAdvancedFilters = (filters: StudentFilters) => {
    if (filters.search) setSearchQuery(filters.search)
    if (filters.class) setClassFilter(filters.class)
    if (filters.section) setSectionFilter(filters.section)
    if (filters.gender) setGenderFilter(filters.gender)
    if (filters.status) setStatusFilter(filters.status)
  }

  const clearAllFilters = () => {
    setSearchQuery("")
    setClassFilter("all")
    setSectionFilter("all")
    setGenderFilter("all")
    setStatusFilter("all")
  }

  const currentFilters: StudentFilters = {
    search: searchQuery || undefined,
    class: classFilter !== "all" ? classFilter : undefined,
    section: sectionFilter !== "all" ? sectionFilter : undefined,
    gender: genderFilter !== "all" ? genderFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  }

  const headerCard = (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <CardTitle className="text-xl font-semibold">Students List</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/students/add">
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Link>
            </Button>
            <ExportDialog students={displayedStudents} filters={currentFilters} onExport={handleExport} />
          </div>
        </div>
      </CardHeader>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        {headerCard}
        <Card>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Loading students...
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        {headerCard}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-destructive">Error Loading Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Failed to load students. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {selectedStudents.length > 0 && (
        <BulkActions
          selectedStudents={selectedStudents}
          onBulkDelete={handleBulkDelete}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onClearSelection={() => setSelectedStudents([])}
        />
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <CardTitle className="text-xl font-semibold">Students List</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild className="w-full sm:w-auto">
                <Link href="/students/add">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
                </Link>
              </Button>
              <ExportDialog students={displayedStudents} filters={currentFilters} onExport={handleExport} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search students by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                value={classFilter}
                onValueChange={(value) => {
                  setClassFilter(value)
                  setSectionFilter("all")
                }}
              >
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sectionOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>

              <AdvancedSearch
                filters={currentFilters}
                onFiltersChange={handleAdvancedFilters}
                onClearFilters={clearAllFilters}
              />

              <Button variant="outline" onClick={clearAllFilters}>
                Clear
              </Button>
            </div>
          </div>

          {/* Results Info */}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {displayedStudents.length} of {pagination.total} students
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedStudents.length === displayedStudents.length && displayedStudents.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedStudents.map((student, index) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="group hover:bg-muted/50"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={(checked) => handleSelectStudent(student.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={student.photo || "/placeholder.svg"}
                            alt={`${student.firstName} ${student.lastName}`}
                          />
                          <AvatarFallback>
                            {student.firstName[0]}
                            {student.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link
                            href={`/students/${student.id}`}
                            className="font-medium hover:text-primary transition-colors cursor-pointer"
                          >
                            {student.firstName} {student.lastName}
                          </Link>
                          <p className="text-sm text-muted-foreground">ID: {student.studentId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{student.class}</TableCell>
                    <TableCell>{student.section}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.phone}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          student.status === "active"
                            ? "default"
                            : student.status === "inactive"
                              ? "secondary"
                              : "destructive"
                        }
                        className="capitalize"
                      >
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {/* View Student */}
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="text-blue-600 hover:text-blue-800"
                          title="View Profile"
                        >
                          <Link href={`/students/${student.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        
                        {/* Edit Student */}
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="text-amber-600 hover:text-amber-800"
                          title="Edit Student"
                        >
                          <Link href={`/students/${student.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        
                        {/* Delete Student */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800"
                              title="Delete Student"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Student</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {student.firstName} {student.lastName}? This action cannot be undone and will remove all associated records.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(student.id)}
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
              </TableBody>
            </Table>
          </div>

          {/* Empty State */}
          {displayedStudents.length === 0 && (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No students found</h3>
                <p className="text-sm">
                  {searchQuery ||
                  classFilter !== "all" ||
                  sectionFilter !== "all" ||
                  genderFilter !== "all" ||
                  statusFilter !== "all"
                    ? "Try adjusting your search terms or filters"
                    : "Get started by adding your first student"}
                </p>
              </div>
              {!searchQuery &&
                classFilter === "all" &&
                sectionFilter === "all" &&
                genderFilter === "all" &&
                statusFilter === "all" && (
                  <Button asChild>
                    <Link href="/students/add">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Student
                    </Link>
                  </Button>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => studentsQuery.changePage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => studentsQuery.changePage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
