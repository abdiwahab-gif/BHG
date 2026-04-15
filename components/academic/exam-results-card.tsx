"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { FileText, TrendingUp, Users, BarChart3 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

export function ExamResultsCard() {
  const [isHovered, setIsHovered] = useState(false)
  const router = useRouter()

  const handleNavigate = () => {
    router.push("/exam-results")
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card className="h-full cursor-pointer transition-all duration-300 hover:shadow-lg border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Exam Results</CardTitle>
                <CardDescription className="text-sm">Manage exam results and student performance</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              New
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2 rounded bg-muted/50">
              <div className="flex items-center justify-center mb-1">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-sm font-medium">1,250</div>
              <div className="text-xs text-muted-foreground">Students</div>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-sm font-medium">3.2</div>
              <div className="text-xs text-muted-foreground">Avg GPA</div>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <div className="flex items-center justify-center mb-1">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-sm font-medium">4,500</div>
              <div className="text-xs text-muted-foreground">Results</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Published Results</span>
              <span className="font-medium">93%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: "93%" }}></div>
            </div>
          </div>

          <motion.div animate={{ opacity: isHovered ? 1 : 0.7 }} transition={{ duration: 0.2 }}>
            <Button onClick={handleNavigate} className="w-full" size="sm">
              Open Exam Results
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
