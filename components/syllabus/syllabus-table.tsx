"use client"

import { useState } from "react"
import { 
  Search, 
  Download, 
  Trash2, 
  Eye, 
  Filter,
  FileText,
  Calendar,
  User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useSyllabi, useSyllabusFilters, useDeleteSyllabus } from "@/hooks/use-syllabus"
import { useClasses } from "@/hooks/use-classes"
import type { Syllabus } from "@/types/syllabus"

export function SyllabusTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [facultyFilter, setFacultyFilter] = useState("")
  const { toast } = useToast()
  const { filters, updateFilters, clearFilters } = useSyllabusFilters()
  const { data: syllabusData, isLoading } = useSyllabi({
    ...filters,
    search: searchTerm,
    faculty: facultyFilter || undefined,
  })
  const { data: classesData } = useClasses()
  const deleteSyllabus = useDeleteSyllabus()

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const handleFacultyFilter = (value: string) => {
    setFacultyFilter(value)
  }

  const handleClassFilter = (classId: string) => {
    if (classId === "all") {
      updateFilters({ classId: undefined, courseId: undefined })
    } else {
      updateFilters({ classId, courseId: undefined })
    }
  }

  const handleDownload = (syllabus: Syllabus) => {
    // In a real app, this would download the file from the server
    toast({
      title: "Download Started",
      description: `Downloading ${syllabus.fileName}...`,
    })
    
    // Mock download behavior
    const link = document.createElement('a')
    link.href = syllabus.fileUrl
    link.download = syllabus.fileName
    link.click()
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteSyllabus.mutateAsync(id)
      toast({
        title: "Success",
        description: "Syllabus deleted successfully!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete syllabus",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "📄"
    if (fileType.includes("word") || fileType.includes("document")) return "📝"
    return "📄"
  }

  const getFileTypeBadge = (fileType: string) => {
    if (fileType.includes("pdf")) return "PDF"
    if (fileType.includes("word") || fileType.includes("document")) return "DOC"
    if (fileType.includes("text")) return "TXT"
    return "FILE"
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading syllabi...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Syllabus List</span>
          {syllabusData && (
            <Badge variant="secondary" className="ml-2">
              {syllabusData.total} total
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col space-y-4 mb-6 md:flex-row md:items-center md:space-y-0 md:space-x-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search syllabi..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Faculty Filter */}
          <Input
            placeholder="Filter by faculty"
            value={facultyFilter}
            onChange={(e) => handleFacultyFilter(e.target.value)}
            className="w-full md:w-[200px]"
          />

          {/* Class Filter */}
          <Select
            value={filters.classId || "all"}
            onValueChange={handleClassFilter}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classesData?.map((classItem: any) => (
                <SelectItem key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          <Button
            variant="outline"
            onClick={() => {
              clearFilters()
              setFacultyFilter("")
              setSearchTerm("")
            }}
            className="w-full md:w-auto"
          >
            <Filter className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Faculty</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {syllabusData?.syllabi.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2 text-gray-500">
                      <FileText className="h-8 w-8" />
                      <p>No syllabi found</p>
                      <p className="text-sm">Upload your first syllabus to get started</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                syllabusData?.syllabi.map((syllabus) => (
                  <TableRow key={syllabus.id}>
                    <TableCell>
                      <div className="font-medium">{syllabus.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{syllabus.faculty || ""}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{syllabus.className}</Badge>
                    </TableCell>
                    <TableCell>{syllabus.courseName}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getFileTypeIcon(syllabus.fileType)}</span>
                        <div>
                          <div className="text-sm font-medium">{syllabus.fileName}</div>
                          <Badge variant="secondary" className="text-xs">
                            {getFileTypeBadge(syllabus.fileType)}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatFileSize(syllabus.fileSize)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{syllabus.uploadedBy}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {new Date(syllabus.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(syllabus)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Syllabus</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{syllabus.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(syllabus.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination could be added here if needed */}
        {syllabusData && syllabusData.total > syllabusData.limit && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Showing {syllabusData.syllabi.length} of {syllabusData.total} syllabi
          </div>
        )}
      </CardContent>
    </Card>
  )
}