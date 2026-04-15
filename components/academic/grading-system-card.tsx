"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Settings, Award, Target } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useCreateGradingSystem } from "@/hooks/use-gpa"

export function GradingSystemCard() {
  const [isHovered, setIsHovered] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    type: "gpa_4" as const,
    departmentId: "all", // Updated default value to "all"
  })

  const createGradingSystem = useCreateGradingSystem()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createGradingSystem.mutate(formData, {
      onSuccess: () => {
        setIsDialogOpen(false)
        setFormData({ name: "", type: "gpa_4", departmentId: "all" }) // Updated default value to "all"
      },
    })
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card className="h-full transition-all duration-300 hover:shadow-lg border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Settings className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Grading System</CardTitle>
                <CardDescription className="text-sm">Configure grading scales and grade mappings</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded bg-muted/50 text-center">
              <Award className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
              <div className="text-sm font-medium">4.0 Scale</div>
              <div className="text-xs text-muted-foreground">Default</div>
            </div>
            <div className="p-3 rounded bg-muted/50 text-center">
              <Target className="h-5 w-5 text-amber-600 mx-auto mb-1" />
              <div className="text-sm font-medium">Letter Grades</div>
              <div className="text-xs text-muted-foreground">A to F</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Current Systems:</div>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                Standard 4.0
              </Badge>
              <Badge variant="outline" className="text-xs">
                Percentage
              </Badge>
              <Badge variant="outline" className="text-xs">
                Letter Grade
              </Badge>
            </div>
          </div>

          <motion.div animate={{ opacity: isHovered ? 1 : 0.7 }} transition={{ duration: 0.2 }}>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" size="sm">
                  Configure Grading
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Grading System</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">System Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Engineering 4.0 Scale"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Grading Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: any) => setFormData((prev) => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpa_4">4.0 GPA Scale</SelectItem>
                        <SelectItem value="gpa_5">5.0 GPA Scale</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="letter">Letter Grades</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department (Optional)</Label>
                    <Select
                      value={formData.departmentId}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, departmentId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="cs">Computer Science</SelectItem>
                        <SelectItem value="math">Mathematics</SelectItem>
                        <SelectItem value="eng">Engineering</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full" disabled={createGradingSystem.isPending}>
                    {createGradingSystem.isPending ? "Creating..." : "Create System"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
