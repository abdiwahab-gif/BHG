"use client"
import { motion } from "framer-motion"
import { StudentProfileHeader } from "@/components/students/student-profile-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Home, GraduationCap, FileText, Calendar, BarChart3, FolderOpen, DollarSign } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useStudent } from "@/hooks/use-students"

// Mock academic data
const mockAcademicData = {
  currentGPA: 3.8,
  totalCredits: 45,
  completedCredits: 42,
  subjects: [
    { name: "Mathematics", grade: "A", credits: 4, teacher: "Dr. Smith" },
    { name: "Physics", grade: "A-", credits: 4, teacher: "Prof. Johnson" },
    { name: "Chemistry", grade: "B+", credits: 4, teacher: "Dr. Wilson" },
    { name: "English", grade: "A", credits: 3, teacher: "Ms. Brown" },
    { name: "History", grade: "B", credits: 3, teacher: "Mr. Davis" },
  ],
}

// Mock attendance data
const mockAttendanceData = {
  totalDays: 180,
  presentDays: 165,
  absentDays: 15,
  attendancePercentage: 91.7,
  recentAttendance: [
    { date: "2024-03-15", status: "present" },
    { date: "2024-03-14", status: "present" },
    { date: "2024-03-13", status: "absent" },
    { date: "2024-03-12", status: "present" },
    { date: "2024-03-11", status: "present" },
  ],
}

// Mock marks data
const mockMarksData = [
  { exam: "Mid-term Exam", subject: "Mathematics", marks: 85, totalMarks: 100, grade: "A" },
  { exam: "Mid-term Exam", subject: "Physics", marks: 78, totalMarks: 100, grade: "B+" },
  { exam: "Mid-term Exam", subject: "Chemistry", marks: 82, totalMarks: 100, grade: "A-" },
  { exam: "Quiz 1", subject: "English", marks: 45, totalMarks: 50, grade: "A" },
  { exam: "Assignment", subject: "History", marks: 38, totalMarks: 40, grade: "A-" },
]

// Mock documents data
const mockDocuments = [
  { name: "Birth Certificate", type: "PDF", uploadDate: "2024-01-15", size: "2.3 MB" },
  { name: "Previous School Certificate", type: "PDF", uploadDate: "2024-01-15", size: "1.8 MB" },
  { name: "Medical Certificate", type: "PDF", uploadDate: "2024-01-20", size: "1.2 MB" },
  { name: "Photo ID", type: "JPG", uploadDate: "2024-01-15", size: "0.8 MB" },
]

export default function StudentDetailPage() {
  const params = useParams()
  const studentId = params.id as string

  const { student, loading, error } = useStudent(studentId)

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Loading student...
          </div>
        </div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-12">
          <h1 className="text-xl font-semibold text-foreground mb-2">Student not found</h1>
          <p className="text-muted-foreground mb-6">Unable to load this student record.</p>
          <Button asChild variant="outline">
            <Link href="/students">Back to Students</Link>
          </Button>
        </div>
      </div>
    )
  }

  const getAttendanceStatusBadge = (status: string) => {
    return (
      <Badge variant={status === "present" ? "default" : "destructive"} className="capitalize">
        {status}
      </Badge>
    )
  }

  const getGradeBadge = (grade: string) => {
    const getVariant = (grade: string) => {
      if (grade.startsWith("A")) return "default"
      if (grade.startsWith("B")) return "secondary"
      return "outline"
    }

    return (
      <Badge variant={getVariant(grade)} className="font-mono">
        {grade}
      </Badge>
    )
  }

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
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
                <Home className="h-4 w-4" />
                Home
              </Link>
              <span>/</span>
              <Link href="/students" className="hover:text-foreground transition-colors">
                Students
              </Link>
              <span>/</span>
              <span>
                {student.firstName} {student.lastName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-sans text-balance">Student Profile</h1>
              <p className="text-muted-foreground text-base sm:text-lg">View and manage student information</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Profile Header */}
        <StudentProfileHeader student={student} />

        {/* Tabbed Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="academic" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Academic</span>
              </TabsTrigger>
              <TabsTrigger value="parents" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Parents</span>
              </TabsTrigger>
              <TabsTrigger value="attendance" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Attendance</span>
              </TabsTrigger>
              <TabsTrigger value="marks" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Marks</span>
              </TabsTrigger>
              <TabsTrigger value="finances" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Finances</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Documents</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Full Name:</span>
                        <p className="font-medium">
                          {student.firstName} {student.lastName}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Student ID:</span>
                        <p className="font-medium">{student.studentId}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Gender:</span>
                        <p className="font-medium capitalize">{student.gender}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Blood Type:</span>
                        <p className="font-medium">{student.bloodType}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Nationality:</span>
                        <p className="font-medium">{student.nationality}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Religion:</span>
                        <p className="font-medium capitalize">{student.religion}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Email Address:</span>
                        <p className="font-medium">{student.email}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phone Number:</span>
                        <p className="font-medium">{student.phone}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Address:</span>
                        <p className="font-medium">
                          {student.address}, {student.city} {student.zip}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="academic" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Academic Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">{mockAcademicData.currentGPA}</div>
                      <p className="text-sm text-muted-foreground">Current GPA</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Credits Progress</span>
                        <span>
                          {mockAcademicData.completedCredits}/{mockAcademicData.totalCredits}
                        </span>
                      </div>
                      <Progress value={(mockAcademicData.completedCredits / mockAcademicData.totalCredits) * 100} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Current Subjects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Teacher</TableHead>
                          <TableHead>Credits</TableHead>
                          <TableHead>Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockAcademicData.subjects.map((subject, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{subject.name}</TableCell>
                            <TableCell>{subject.teacher}</TableCell>
                            <TableCell>{subject.credits}</TableCell>
                            <TableCell>{getGradeBadge(subject.grade)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="parents" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Father's Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-muted-foreground text-sm">Name:</span>
                      <p className="font-medium">{student.fatherName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Phone:</span>
                      <p className="font-medium">{student.fatherPhone}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Mother's Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-muted-foreground text-sm">Name:</span>
                      <p className="font-medium">{student.motherName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Phone:</span>
                      <p className="font-medium">{student.motherPhone}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">{mockAttendanceData.attendancePercentage}%</div>
                      <p className="text-sm text-muted-foreground">Attendance Rate</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Days:</span>
                        <span className="font-medium">{mockAttendanceData.totalDays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Present:</span>
                        <span className="font-medium text-amber-600">{mockAttendanceData.presentDays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Absent:</span>
                        <span className="font-medium text-red-600">{mockAttendanceData.absentDays}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Recent Attendance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockAttendanceData.recentAttendance.map((record, index) => (
                          <TableRow key={index}>
                            <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                            <TableCell>{getAttendanceStatusBadge(record.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="marks" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Examination Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exam</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockMarksData.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{result.exam}</TableCell>
                          <TableCell>{result.subject}</TableCell>
                          <TableCell>{result.marks}</TableCell>
                          <TableCell>{result.totalMarks}</TableCell>
                          <TableCell>{((result.marks / result.totalMarks) * 100).toFixed(1)}%</TableCell>
                          <TableCell>{getGradeBadge(result.grade)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="finances" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">$2,500.00</div>
                        <div className="text-sm text-gray-600">Total Fees Due</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-amber-600">$1,800.00</div>
                        <div className="text-sm text-gray-600">Total Paid</div>
                      </div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">$700.00</div>
                      <div className="text-sm text-gray-600">Outstanding Balance</div>
                    </div>
                    <div className="pt-4">
                      <Button className="w-full" size="lg">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Make Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">Tuition Fee - Semester 1</div>
                          <div className="text-sm text-gray-600">Paid on Mar 15, 2024</div>
                        </div>
                        <div className="text-amber-600 font-bold">$900.00</div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">Registration Fee</div>
                          <div className="text-sm text-gray-600">Paid on Jan 10, 2024</div>
                        </div>
                        <div className="text-amber-600 font-bold">$200.00</div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">Lab Fee</div>
                          <div className="text-sm text-gray-600">Paid on Feb 5, 2024</div>
                        </div>
                        <div className="text-amber-600 font-bold">$150.00</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Fees</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fee Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Tuition Fee - Semester 2</TableCell>
                        <TableCell>$900.00</TableCell>
                        <TableCell>Apr 15, 2024</TableCell>
                        <TableCell>
                          <Badge variant="destructive">Overdue</Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm">Pay Now</Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Library Fee</TableCell>
                        <TableCell>$50.00</TableCell>
                        <TableCell>May 1, 2024</TableCell>
                        <TableCell>
                          <Badge variant="outline">Pending</Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">Pay Now</Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Student Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Upload Date</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockDocuments.map((doc, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{doc.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{doc.type}</Badge>
                          </TableCell>
                          <TableCell>{new Date(doc.uploadDate).toLocaleDateString()}</TableCell>
                          <TableCell>{doc.size}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <button className="text-primary hover:text-primary/80 text-sm">View</button>
                              <button className="text-primary hover:text-primary/80 text-sm">Download</button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </motion.div>
  )
}
