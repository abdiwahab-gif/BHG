"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Edit, Plus, Search, Filter, MoreVertical, BookOpen, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useClassCourses } from "@/hooks/use-classes"
import { Skeleton } from "@/components/ui/skeleton"
import type { ClassCourse } from "@/hooks/use-classes"

interface CourseTableProps {
  classId: string
  courses: ClassCourse[]
}

export function CourseTable({ classId, courses: initialCourses }: CourseTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  // Use React Query to fetch courses with real-time updates
  const { data: courses, isLoading } = useClassCourses(classId)
  const coursesData = courses || initialCourses

  // Filter courses based on search and type
  const filteredCourses = coursesData.filter((course) => {
    const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || course.type === typeFilter
    return matchesSearch && matchesType
  })

  const handleEditCourse = (courseId: string) => {
    console.log("[v0] Edit course clicked:", courseId)
    // TODO: Open edit modal
  }

  const handleDeleteCourse = (courseId: string) => {
    console.log("[v0] Delete course clicked:", courseId)
    // TODO: Implement delete functionality
  }

  const handleAddCourse = () => {
    console.log("[v0] Add course clicked for class:", classId)
    // TODO: Open add course modal
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Header with Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium text-foreground">Courses</h3>
          <Badge variant="secondary" className="text-xs">
            {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32 bg-background border-border">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="General">General</SelectItem>
              <SelectItem value="Elective">Elective</SelectItem>
            </SelectContent>
          </Select>

          {/* Add Course Button */}
          <Button onClick={handleAddCourse} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Course
          </Button>
        </div>
      </div>

      {/* Courses Table */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-8 border border-border rounded-lg bg-card">
          <div className="text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery || typeFilter !== "all" ? "No courses found" : "No courses added"}
            </h3>
            <p className="text-sm">
              {searchQuery || typeFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Start by adding courses to this class"}
            </p>
            {!searchQuery && typeFilter === "all" && (
              <Button onClick={handleAddCourse} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Add First Course
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-medium">Course Name</TableHead>
                <TableHead className="font-medium">Type</TableHead>
                <TableHead className="font-medium">Credits</TableHead>
                <TableHead className="font-medium">Teacher</TableHead>
                <TableHead className="font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.map((course, index) => (
                <motion.tr
                  key={course.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  className="group hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      {course.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={course.type === "General" ? "default" : "secondary"} className="text-xs">
                      {course.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{course.credits || 3}</span>
                  </TableCell>
                  <TableCell>
                    {course.teacherName ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{course.teacherName}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditCourse(course.id)}
                        className="gap-2 bg-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleEditCourse(course.id)} className="gap-2">
                            <Edit className="h-4 w-4" />
                            Edit Course
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <User className="h-4 w-4" />
                            Assign Teacher
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteCourse(course.id)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <BookOpen className="h-4 w-4" />
                            Remove Course
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Table Footer with Summary */}
      {filteredCourses.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
          <div>
            Showing {filteredCourses.length} of {coursesData.length} courses
          </div>
          <div className="flex items-center gap-4">
            <span>Total Credits: {filteredCourses.reduce((sum, course) => sum + (course.credits || 3), 0)}</span>
            <span>
              General: {filteredCourses.filter((c) => c.type === "General").length} | Elective:{" "}
              {filteredCourses.filter((c) => c.type === "Elective").length}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  )
}
