"use client"

import { BookOpen, FileText, Upload } from "lucide-react"

export function SyllabusHeader() {
  return (
    <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
      <div className="flex items-center space-x-2">
        <BookOpen className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Syllabus Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload and manage course syllabi for different classes
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-1">
          <FileText className="h-4 w-4" />
          <span>PDF, Word, Text files supported</span>
        </div>
        <div className="flex items-center space-x-1">
          <Upload className="h-4 w-4" />
          <span>Max size: 10MB</span>
        </div>
      </div>
    </div>
  )
}