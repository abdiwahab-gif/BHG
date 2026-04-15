"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronUp, Edit, Users, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ClassSection } from "./class-section"
import { CourseTable } from "./course-table"
import type { Class } from "@/hooks/use-classes"

interface ClassListProps {
  classes: Class[]
}

export function ClassList({ classes }: ClassListProps) {
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set(["1"])) // Expand first class by default

  const toggleClassExpansion = (classId: string) => {
    setExpandedClasses((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(classId)) {
        newSet.delete(classId)
      } else {
        newSet.add(classId)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-6">
      {classes.map((classData, index) => {
        const isExpanded = expandedClasses.has(classData.id)

        return (
          <motion.div
            key={classData.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          >
            <Card className="border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleClassExpansion(classData.id)}
                      className="p-2 h-auto"
                    >
                      <div className="p-1 bg-primary/10 rounded">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </Button>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">{classData.name}</h2>
                      {classData.description && (
                        <p className="text-sm text-muted-foreground mt-1">{classData.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {classData.sections.length} Section{classData.sections.length !== 1 ? "s" : ""}
                    </Badge>
                    <Button size="sm" variant="outline" className="gap-2 bg-transparent">
                      <Edit className="h-4 w-4" />
                      Edit Class
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <CardContent className="pt-0">
                      <Tabs defaultValue="class" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-6">
                          <TabsTrigger value="class" className="gap-2">
                            <div className="w-4 h-4 bg-primary/20 rounded flex items-center justify-center">
                              <div className="w-2 h-2 bg-primary rounded-sm"></div>
                            </div>
                            Class
                          </TabsTrigger>
                          <TabsTrigger value="syllabus" className="gap-2">
                            <Calendar className="h-4 w-4" />
                            Syllabus
                          </TabsTrigger>
                          <TabsTrigger value="courses" className="gap-2">
                            <Users className="h-4 w-4" />
                            Courses
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="class" className="space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-foreground">
                              Total Sections: {classData.sections.length}
                            </h3>
                            <Button size="sm" variant="outline" className="gap-2 bg-transparent">
                              <Edit className="h-4 w-4" />
                              Edit Class
                            </Button>
                          </div>

                          <div className="space-y-4">
                            {classData.sections.map((section) => (
                              <ClassSection key={section.id} section={section} classId={classData.id} />
                            ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="syllabus" className="space-y-4">
                          <div className="text-center py-8">
                            <div className="text-muted-foreground">
                              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <h3 className="text-lg font-medium mb-2">Syllabus Management</h3>
                              <p className="text-sm">Syllabus management features will be available soon.</p>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="courses" className="space-y-4">
                          <CourseTable classId={classData.id} courses={classData.courses} />
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
