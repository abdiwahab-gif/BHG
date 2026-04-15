"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Edit, Users, Calendar, MapPin, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import type { ClassSection as ClassSectionType } from "@/hooks/use-classes"

interface ClassSectionProps {
  section: ClassSectionType
  classId: string
}

export function ClassSection({ section, classId }: ClassSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const occupancyPercentage = (section.currentStudents / section.capacity) * 100
  const occupancyColor = occupancyPercentage > 90 ? "destructive" : occupancyPercentage > 75 ? "secondary" : "default"

  const cardVariants = {
    collapsed: {
      height: "auto",
      transition: {
        duration: 0.3,
        ease: "easeInOut",
      },
    },
    expanded: {
      height: "auto",
      transition: {
        duration: 0.3,
        ease: "easeInOut",
      },
    },
  }

  const contentVariants = {
    collapsed: {
      opacity: 0,
      height: 0,
      transition: {
        duration: 0.2,
        ease: "easeInOut",
      },
    },
    expanded: {
      opacity: 1,
      height: "auto",
      transition: {
        duration: 0.3,
        ease: "easeInOut",
        delay: 0.1,
      },
    },
  }

  const buttonVariants = {
    hover: {
      scale: 1.02,
      transition: {
        duration: 0.2,
      },
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: 0.1,
      },
    },
  }

  return (
    <motion.div variants={cardVariants} animate={isExpanded ? "expanded" : "collapsed"} className="w-full" layout>
      <Card className="border border-border bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 h-auto hover:bg-primary/10"
                >
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </motion.div>
                </Button>
              </motion.div>

              <div className="flex-1">
                <h4 className="font-medium text-foreground">{section.name}</h4>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    Room No: {section.roomNumber}
                  </div>
                  <Badge variant={occupancyColor} className="text-xs">
                    {section.currentStudents}/{section.capacity} Students
                  </Badge>
                </div>

                {/* Progress bar for occupancy */}
                <div className="mt-2 w-full max-w-xs">
                  <Progress value={occupancyPercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{occupancyPercentage.toFixed(0)}% occupied</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                <Button size="sm" variant="outline" className="gap-2 bg-transparent">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </motion.div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                    <Button variant="ghost" size="sm" className="p-2">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="gap-2">
                    <Users className="h-4 w-4" />
                    View Students
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <Calendar className="h-4 w-4" />
                    View Routine
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2">
                    <Edit className="h-4 w-4" />
                    Edit Section
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              variants={contentVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              className="overflow-hidden"
            >
              <CardContent className="pt-0 space-y-4">
                {/* Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap" className="w-full">
                    <Button variant="outline" className="gap-2 justify-start bg-transparent w-full">
                      <Users className="h-4 w-4" />
                      View Students
                    </Button>
                  </motion.div>
                  <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap" className="w-full">
                    <Button variant="outline" className="gap-2 justify-start bg-transparent w-full">
                      <Calendar className="h-4 w-4" />
                      View Routine
                    </Button>
                  </motion.div>
                </div>

                {/* Section Details */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="pt-2 border-t border-border"
                >
                  <h5 className="font-medium text-foreground mb-3">Section Details</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Capacity:</span>
                        <span className="font-medium">{section.capacity} students</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Students:</span>
                        <span className="font-medium">{section.currentStudents} students</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Available Seats:</span>
                        <span className="font-medium">{section.capacity - section.currentStudents} seats</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Occupancy Rate:</span>
                        <span className="font-medium">{occupancyPercentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Room Information */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="pt-2 border-t border-border"
                >
                  <h5 className="font-medium text-foreground mb-2">Room Information</h5>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Room {section.roomNumber}</span>
                    <Badge variant="outline" className="text-xs">
                      Classroom
                    </Badge>
                  </div>
                </motion.div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}
