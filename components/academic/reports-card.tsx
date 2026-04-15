"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { BarChart3, Download, FileText, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ReportsPanel } from "@/components/exam-results/reports-panel"

export function ReportsCard() {
  const [isHovered, setIsHovered] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

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
              <div className="p-2 rounded-lg bg-chart-1/10">
                <BarChart3 className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Reports & Analytics</CardTitle>
                <CardDescription className="text-sm">Generate transcripts and performance reports</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              Analytics
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded bg-muted/50 text-center">
              <FileText className="h-4 w-4 text-blue-600 mx-auto mb-1" />
              <div className="text-xs font-medium">Transcripts</div>
            </div>
            <div className="p-2 rounded bg-muted/50 text-center">
              <Download className="h-4 w-4 text-amber-600 mx-auto mb-1" />
              <div className="text-xs font-medium">Exports</div>
            </div>
            <div className="p-2 rounded bg-muted/50 text-center">
              <TrendingUp className="h-4 w-4 text-purple-600 mx-auto mb-1" />
              <div className="text-xs font-medium">Analytics</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Available Reports:</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Grade Distribution</span>
                <Badge variant="outline" className="text-xs">
                  PDF/Excel
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Performance Trends</span>
                <Badge variant="outline" className="text-xs">
                  Charts
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Student Transcripts</span>
                <Badge variant="outline" className="text-xs">
                  Official
                </Badge>
              </div>
            </div>
          </div>

          <motion.div animate={{ opacity: isHovered ? 1 : 0.7 }} transition={{ duration: 0.2 }}>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" size="sm">
                  Generate Reports
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Reports & Analytics Center</DialogTitle>
                </DialogHeader>
                <ReportsPanel />
              </DialogContent>
            </Dialog>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
