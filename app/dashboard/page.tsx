"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Filter, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Toaster } from "@/components/ui/toaster"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import { clearAuthSession } from "@/lib/session-client"

import { CreateSessionCard } from "@/components/academic/create-session-card"
import { BrowseSessionCard } from "@/components/academic/browse-session-card"
import { CreateSemesterCard } from "@/components/academic/create-semester-card"
import { AttendanceTypeCard } from "@/components/academic/attendance-type-card"
import { CreateClassCard } from "@/components/academic/create-class-card"
import { CreateCourseCard } from "@/components/academic/create-course-card"
import { CreateFacultyCard } from "@/components/academic/create-faculty-card"
import { CreateSectionCard } from "@/components/academic/create-section-card"
import { AssignTeacherCard } from "@/components/academic/assign-teacher-card"
import { ExamResultsCard } from "@/components/academic/exam-results-card"
import { GradingSystemCard } from "@/components/academic/grading-system-card"
import { ExamTypesCard } from "@/components/academic/exam-types-card"
import { ReportsCard } from "@/components/academic/reports-card"
import { ManageUsersCard } from "@/components/academic/manage-users-card"

// Define card data for search and filtering
const cardData = [
  {
    id: "create-session",
    title: "Create Session",
    description: "Set up new academic session",
    category: "session",
    keywords: ["session", "academic", "year", "create", "new"],
    component: CreateSessionCard,
  },
  {
    id: "browse-session",
    title: "Browse by Session",
    description: "Navigate through different academic sessions",
    category: "session",
    keywords: ["browse", "session", "navigate", "switch"],
    component: BrowseSessionCard,
  },
  {
    id: "create-semester",
    title: "Create Semester",
    description: "Add semester to current session",
    category: "semester",
    keywords: ["semester", "create", "term", "period"],
    component: CreateSemesterCard,
  },
  {
    id: "attendance-type",
    title: "Attendance Type",
    description: "Configure how attendance is tracked",
    category: "attendance",
    keywords: ["attendance", "tracking", "configuration", "settings"],
    component: AttendanceTypeCard,
  },
  {
    id: "create-class",
    title: "Create Class",
    description: "Add new class to the system",
    category: "class",
    keywords: ["class", "grade", "create", "new"],
    component: CreateClassCard,
  },
  {
    id: "create-faculty",
    title: "Create Faculty",
    description: "Add faculties for predefined academic structure",
    category: "course",
    keywords: ["faculty", "department", "create", "import"],
    component: CreateFacultyCard,
  },
  {
    id: "create-course",
    title: "Create Course",
    description: "Add courses to curriculum",
    category: "course",
    keywords: ["course", "subject", "curriculum", "create"],
    component: CreateCourseCard,
  },
  {
    id: "create-section",
    title: "Create Section",
    description: "Add sections and assign to classes",
    category: "section",
    keywords: ["section", "room", "assign", "create"],
    component: CreateSectionCard,
  },
  {
    id: "assign-teacher",
    title: "Assign Teacher",
    description: "Assign teachers to courses",
    category: "teacher",
    keywords: ["teacher", "assign", "instructor", "faculty"],
    component: AssignTeacherCard,
  },
  {
    id: "exam-results",
    title: "Exam Results",
    description: "Manage exam results and student performance",
    category: "exams",
    keywords: ["exam", "results", "grades", "performance", "scores"],
    component: ExamResultsCard,
  },
  {
    id: "grading-system",
    title: "Grading System",
    description: "Configure grading scales and grade mappings",
    category: "exams",
    keywords: ["grading", "scale", "mapping", "gpa", "grades"],
    component: GradingSystemCard,
  },
  {
    id: "exam-types",
    title: "Exam Types",
    description: "Define exam types and assessment methods",
    category: "exams",
    keywords: ["exam", "types", "assessment", "midterm", "final"],
    component: ExamTypesCard,
  },
  {
    id: "reports",
    title: "Reports & Analytics",
    description: "Generate transcripts and performance reports",
    category: "reports",
    keywords: ["reports", "analytics", "transcripts", "export", "statistics"],
    component: ReportsCard,
  },
  {
    id: "manage-users",
    title: "User Management",
    description: "Manage system users and roles",
    category: "admin",
    keywords: ["users", "admin", "roles", "permissions", "manage"],
    component: ManageUsersCard,
  },
]

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [academicYear, setAcademicYear] = useState("")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")
    
    if (!token || !userData) {
      router.push("/login")
      return
    }
    
    setUser(JSON.parse(userData))
  }, [router])

  const handleLogout = () => {
    clearAuthSession()
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    })
    router.push("/login")
  }

  // Filter cards based on search and category
  const filteredCards = useMemo(() => {
    return cardData.filter((card) => {
      const matchesSearch =
        searchQuery === "" ||
        card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.keywords.some((keyword) => keyword.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCategory = selectedCategory === "all" || card.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "session", label: "Sessions" },
    { value: "semester", label: "Semesters" },
    { value: "class", label: "Classes" },
    { value: "course", label: "Courses" },
    { value: "section", label: "Sections" },
    { value: "teacher", label: "Teachers" },
    { value: "attendance", label: "Attendance" },
    { value: "exams", label: "Exams & Results" },
    { value: "reports", label: "Reports" },
  ]

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setMobileFiltersOpen(false)
  }

  if (!user) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background transition-colors duration-300"
    >
      {/* Page Header with Filters */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="border-b border-border bg-card/30 backdrop-blur-sm"
      >
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 font-sans text-balance">
                    Academic Settings
                  </h1>
                  <p className="text-muted-foreground text-base sm:text-lg">
                    Welcome back, {user.name}!
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout} className="lg:hidden">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>

            {/* Desktop Filters */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="hidden lg:flex items-center gap-3"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search sessions, classes, courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80 bg-background border-border"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40 bg-background border-border">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </motion.div>

            {/* Mobile Filters */}
            <div className="flex lg:hidden justify-end">
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <div className="space-y-4">
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Search Results Info */}
          <AnimatePresence>
            {(searchQuery || selectedCategory !== "all") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredCards.length} of {cardData.length} cards
                  </p>
                  <Button variant="link" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          {filteredCards.length === 0 ? (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No cards found</h3>
              <p className="text-sm">Try adjusting your search terms or filters</p>
            </motion.div>
          ) : (
            <motion.div
              key="cards-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            >
              {filteredCards.map((card, index) => {
                const CardComponent = card.component
                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                  >
                    <CardComponent />
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Toaster />
    </motion.div>
  )
}
