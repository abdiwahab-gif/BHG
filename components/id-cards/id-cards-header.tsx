"use client"

import { CreditCard, Users, GraduationCap, Printer } from "lucide-react"

export function IDCardsHeader() {
  return (
    <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
      <div className="flex items-center space-x-2">
        <CreditCard className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            ID Cards Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create, manage, and print ID cards for students and staff
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-1">
          <GraduationCap className="h-4 w-4" />
          <span>Student Cards</span>
        </div>
        <div className="flex items-center space-x-1">
          <Users className="h-4 w-4" />
          <span>Staff Cards</span>
        </div>
        <div className="flex items-center space-x-1">
          <Printer className="h-4 w-4" />
          <span>Print Ready</span>
        </div>
      </div>
    </div>
  )
}