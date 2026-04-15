"use client"

import { UserCheck, Calendar, Clock, TrendingUp } from "lucide-react"

export function AttendanceHeader() {
  return (
    <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
      <div className="flex items-center space-x-2">
        <UserCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Attendance Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Take attendance and track student participation
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-1">
          <Calendar className="h-4 w-4" />
          <span>Daily Tracking</span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock className="h-4 w-4" />
          <span>Real-time Updates</span>
        </div>
        <div className="flex items-center space-x-1">
          <TrendingUp className="h-4 w-4" />
          <span>Analytics</span>
        </div>
      </div>
    </div>
  )
}