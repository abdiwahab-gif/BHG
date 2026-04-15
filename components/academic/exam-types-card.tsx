"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { ClipboardList, Plus, BookOpen } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useExamTypes } from "@/hooks/use-exam-results"

export function ExamTypesCard() {
  const [isHovered, setIsHovered] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    weight: 0,
    description: "",
  })

  const { data: examTypesData } = useExamTypes()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log("Creating exam type:", formData)
    setIsDialogOpen(false)
    setFormData({ name: "", code: "", weight: 0, description: "" })
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
              <div className="p-2 rounded-lg bg-accent/10">
                <ClipboardList className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Exam Types</CardTitle>
                <CardDescription className="text-sm">Define exam types and assessment methods</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded bg-muted/50 text-center">
              <BookOpen className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <div className="text-sm font-medium">4</div>
              <div className="text-xs text-muted-foreground">Active Types</div>
            </div>
            <div className="p-3 rounded bg-muted/50 text-center">
              <Plus className="h-5 w-5 text-amber-600 mx-auto mb-1" />
              <div className="text-sm font-medium">100%</div>
              <div className="text-xs text-muted-foreground">Total Weight</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Current Types:</div>
            <div className="space-y-1">
              {examTypesData?.data?.slice(0, 3).map((type: any) => (
                <div key={type.id} className="flex justify-between items-center text-xs">
                  <span>{type.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {type.weight}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <motion.div animate={{ opacity: isHovered ? 1 : 0.7 }} transition={{ duration: 0.2 }}>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" size="sm">
                  Manage Exam Types
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Exam Type</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Midterm Exam"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code">Code</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                        placeholder="e.g., MID"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (%)</Label>
                    <Input
                      id="weight"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.weight}
                      onChange={(e) => setFormData((prev) => ({ ...prev, weight: Number(e.target.value) }))}
                      placeholder="30"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Description of the exam type..."
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Create Exam Type
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
