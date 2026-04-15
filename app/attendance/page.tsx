"use client"

import { Suspense } from "react"
import { AttendanceHeader } from "@/components/attendance/attendance-header"
import { TakeAttendanceForm } from "@/components/attendance/take-attendance-form"
import { AttendanceHistory } from "@/components/attendance/attendance-history"
import { Card } from "@/components/ui/card"

export default function AttendancePage() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <AttendanceHeader />
      
      {/* Take Attendance Section - Top Row */}
      <div className="w-full">
        <Card className="p-6">
          <Suspense fallback={<div>Loading form...</div>}>
            <TakeAttendanceForm />
          </Suspense>
        </Card>
      </div>

      {/* Attendance History Section - Bottom Row */}
      <div className="w-full">
        <Card className="p-6">
          <Suspense fallback={<div>Loading history...</div>}>
            <AttendanceHistory />
          </Suspense>
        </Card>
      </div>
    </div>
  )
}