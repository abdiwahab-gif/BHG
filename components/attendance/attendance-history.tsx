"use client"

import { useState } from "react"
import { 
  Calendar, 
  Users, 
  Eye, 
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  User,
  BookOpen,
  Edit,
  Trash2
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Progress } from "@/components/ui/progress"
import { useAttendanceSessions, useAttendanceFilters } from "@/hooks/use-attendance"
import { useClasses } from "@/hooks/use-classes"
import { useToast } from "@/hooks/use-toast"
import type { AttendanceSession } from "@/types/attendance"

export function AttendanceHistory() {
  const { filters, updateFilters, clearFilters } = useAttendanceFilters()
  const { data: sessionsData, isLoading } = useAttendanceSessions(filters)
  const { data: classesData } = useClasses()
  const { toast } = useToast()
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const handleClassFilter = (classId: string) => {
    if (classId === "all") {
      updateFilters({ classId: undefined })
    } else {
      updateFilters({ classId })
    }
  }

  const getAttendanceRate = (session: AttendanceSession) => {
    return Math.round((session.presentCount / session.totalStudents) * 100)
  }

  const handleViewDetails = (session: any) => {
    setSelectedSession(session)
    setIsDialogOpen(true)
  }

  const handleEditSession = (session: any) => {
    setSelectedSession(session)
    setIsEditDialogOpen(true)
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/attendance/${sessionId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete attendance session')
      }
      
      toast({
        title: "Success",
        description: "Attendance session deleted successfully!",
      })
      
      // In a real app, this would refresh the data
      window.location.reload()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete attendance session",
        variant: "destructive",
      })
    }
  }

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 90) return "text-amber-600"
    if (rate >= 75) return "text-yellow-600"
    return "text-red-600"
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading attendance history...</p>
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
          <Calendar className="h-5 w-5" />
          <span>Attendance History</span>
          {sessionsData && (
            <Badge variant="secondary" className="ml-2">
              {sessionsData.total} sessions
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col space-y-4 mb-6 md:flex-row md:items-center md:space-y-0 md:space-x-4">
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

          {/* Date Range Filters */}
          <Input
            type="date"
            placeholder="Start Date"
            value={filters.startDate || ""}
            onChange={(e) => updateFilters({ startDate: e.target.value })}
            className="w-full md:w-[150px]"
          />
          
          <Input
            type="date"
            placeholder="End Date"
            value={filters.endDate || ""}
            onChange={(e) => updateFilters({ endDate: e.target.value })}
            className="w-full md:w-[150px]"
          />

          {/* Clear Filters */}
          <Button
            variant="outline"
            onClick={clearFilters}
            className="w-full md:w-auto"
          >
            <Filter className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        </div>

        {/* Sessions Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Attendance Rate</TableHead>
                <TableHead>Taken By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessionsData?.sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2 text-gray-500">
                      <Calendar className="h-8 w-8" />
                      <p>No attendance sessions found</p>
                      <p className="text-sm">Take your first attendance to see records here</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sessionsData?.sessions.map((session: AttendanceSession) => {
                  const attendanceRate = getAttendanceRate(session)
                  return (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {new Date(session.date).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{session.className}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-4 w-4 text-gray-400" />
                          <span>{session.courseName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1 text-amber-600">
                              <CheckCircle className="w-3 h-3" />
                              <span>{session.presentCount}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-red-600">
                              <XCircle className="w-3 h-3" />
                              <span>{session.absentCount}</span>
                            </div>
                            {session.lateCount > 0 && (
                              <div className="flex items-center space-x-1 text-yellow-600">
                                <Clock className="w-3 h-3" />
                                <span>{session.lateCount}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Total: {session.totalStudents}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${getAttendanceRateColor(attendanceRate)}`}>
                              {attendanceRate}%
                            </span>
                          </div>
                          <Progress 
                            value={attendanceRate} 
                            className="h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{session.takenBy}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* View Details */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(session)}
                            className="text-blue-600 hover:text-blue-800"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {/* Edit Session */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSession(session)}
                            className="text-amber-600 hover:text-amber-800"
                            title="Edit Attendance"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          {/* Delete Session */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800"
                                title="Delete Session"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Attendance Session</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this attendance session for {session.courseName} on {new Date(session.date).toLocaleDateString()}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteSession(session.id)}
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
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        {sessionsData && sessionsData.sessions.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Total Sessions</p>
                  <p className="text-xl font-bold">{sessionsData.total}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm text-gray-500">Avg. Present</p>
                  <p className="text-xl font-bold">
                    {Math.round(
                      sessionsData.sessions.reduce((acc: number, session: AttendanceSession) => 
                        acc + session.presentCount, 0
                      ) / sessionsData.sessions.length
                    )}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-gray-500">Avg. Absent</p>
                  <p className="text-xl font-bold">
                    {Math.round(
                      sessionsData.sessions.reduce((acc: number, session: AttendanceSession) => 
                        acc + session.absentCount, 0
                      ) / sessionsData.sessions.length
                    )}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Avg. Rate</p>
                  <p className="text-xl font-bold">
                    {Math.round(
                      sessionsData.sessions.reduce((acc: number, session: AttendanceSession) => 
                        acc + getAttendanceRate(session), 0
                      ) / sessionsData.sessions.length
                    )}%
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Pagination could be added here if needed */}
        {sessionsData && sessionsData.total > sessionsData.limit && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Showing {sessionsData.sessions.length} of {sessionsData.total} sessions
          </div>
        )}

        {/* Attendance Details Modal */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Attendance Details</span>
              </DialogTitle>
              <DialogDescription>
                {selectedSession && (
                  <span>
                    {selectedSession.courseName} - {new Date(selectedSession.date).toLocaleDateString()}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            
            {selectedSession && (
              <div className="space-y-6">
                {/* Session Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-amber-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Present</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-600">{selectedSession.presentCount}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Absent</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{selectedSession.absentCount}</p>
                  </div>
                  {selectedSession.lateCount > 0 && (
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 text-yellow-600">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">Late</span>
                      </div>
                      <p className="text-2xl font-bold text-yellow-600">{selectedSession.lateCount}</p>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-blue-600">
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">Total</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{selectedSession.totalStudents}</p>
                  </div>
                </div>

                {/* Student List */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Student Attendance Details</span>
                  </h3>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student ID</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSession.students?.map((student: any) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.studentId}</TableCell>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {student.status === 'present' && (
                                  <>
                                    <CheckCircle className="h-4 w-4 text-amber-600" />
                                    <span className="text-amber-600 font-medium">Present</span>
                                  </>
                                )}
                                {student.status === 'absent' && (
                                  <>
                                    <XCircle className="h-4 w-4 text-red-600" />
                                    <span className="text-red-600 font-medium">Absent</span>
                                  </>
                                )}
                                {student.status === 'late' && (
                                  <>
                                    <Clock className="h-4 w-4 text-yellow-600" />
                                    <span className="text-yellow-600 font-medium">Late</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-500">
                                {student.notes || '-'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Session Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">Session Information</h4>
                    <div className="mt-2 space-y-1 text-sm">
                      <p><span className="font-medium">Course:</span> {selectedSession.courseName}</p>
                      <p><span className="font-medium">Class:</span> {selectedSession.className}</p>
                      <p><span className="font-medium">Date:</span> {new Date(selectedSession.date).toLocaleDateString()}</p>
                      <p><span className="font-medium">Time:</span> {new Date(selectedSession.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">Taken By</h4>
                    <div className="mt-2 flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{selectedSession.takenBy}</span>
                    </div>
                    {selectedSession.notes && (
                      <div className="mt-3">
                        <h4 className="font-medium text-gray-700 dark:text-gray-300">Notes</h4>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{selectedSession.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Attendance Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Edit className="h-5 w-5" />
                <span>Edit Attendance</span>
              </DialogTitle>
              <DialogDescription>
                {selectedSession && (
                  <span>
                    {selectedSession.courseName} - {new Date(selectedSession.date).toLocaleDateString()}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            
            {selectedSession && (
              <div className="space-y-6">
                {/* Session Info */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Course:</span> {selectedSession.courseName}
                    </div>
                    <div>
                      <span className="font-medium">Class:</span> {selectedSession.className}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span> {new Date(selectedSession.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Editable Student List */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Edit Student Attendance</span>
                  </h3>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student ID</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSession.students?.map((student: any, index: number) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.studentId}</TableCell>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>
                              <Select
                                value={student.status}
                                onValueChange={(value) => {
                                  // Update student status
                                  const updatedStudents = [...selectedSession.students]
                                  updatedStudents[index].status = value
                                  setSelectedSession({
                                    ...selectedSession,
                                    students: updatedStudents
                                  })
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="present">
                                    <div className="flex items-center space-x-2">
                                      <CheckCircle className="h-4 w-4 text-amber-600" />
                                      <span>Present</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="absent">
                                    <div className="flex items-center space-x-2">
                                      <XCircle className="h-4 w-4 text-red-600" />
                                      <span>Absent</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="late">
                                    <div className="flex items-center space-x-2">
                                      <Clock className="h-4 w-4 text-yellow-600" />
                                      <span>Late</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={student.notes || ''}
                                onChange={(e) => {
                                  // Update student notes
                                  const updatedStudents = [...selectedSession.students]
                                  updatedStudents[index].notes = e.target.value
                                  setSelectedSession({
                                    ...selectedSession,
                                    students: updatedStudents
                                  })
                                }}
                                placeholder="Add notes..."
                                className="w-full"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        // Here you would save the updated attendance
                        const response = await fetch(`/api/attendance/${selectedSession.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            students: selectedSession.students,
                            notes: selectedSession.notes
                          }),
                        })
                        
                        if (!response.ok) {
                          throw new Error('Failed to update attendance')
                        }
                        
                        toast({
                          title: "Success",
                          description: "Attendance updated successfully!",
                        })
                        
                        setIsEditDialogOpen(false)
                        // In a real app, this would refresh the data
                        window.location.reload()
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to update attendance",
                          variant: "destructive",
                        })
                      }
                    }}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}