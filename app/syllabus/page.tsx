"use client"

import { Suspense } from "react"
import { SyllabusHeader } from "@/components/syllabus/syllabus-header"
import { AddSyllabusForm } from "@/components/syllabus/add-syllabus-form"
import { SyllabusTable } from "@/components/syllabus/syllabus-table"
import { Card } from "@/components/ui/card"

export default function SyllabusPage() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <SyllabusHeader />
      
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* Add Syllabus Form */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <Suspense fallback={<div>Loading form...</div>}>
              <AddSyllabusForm />
            </Suspense>
          </Card>
        </div>

        {/* Syllabus Table */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <Suspense fallback={<div>Loading syllabi...</div>}>
              <SyllabusTable />
            </Suspense>
          </Card>
        </div>
      </div>
    </div>
  )
}