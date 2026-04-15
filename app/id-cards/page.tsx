"use client"

import { Suspense } from "react"
import { IDCardsHeader } from "@/components/id-cards/id-cards-header"
import { CreateIDCardForm } from "@/components/id-cards/create-id-card-form"
import { IDCardsTable } from "@/components/id-cards/id-cards-table"
import { Card } from "@/components/ui/card"

export default function IDCardsPage() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <IDCardsHeader />
      
      {/* Create ID Card Section - Top Row */}
      <div className="w-full">
        <Card className="p-6">
          <Suspense fallback={<div>Loading form...</div>}>
            <CreateIDCardForm />
          </Suspense>
        </Card>
      </div>

      {/* ID Cards Table Section - Bottom Row */}
      <div className="w-full">
        <Card className="p-6">
          <Suspense fallback={<div>Loading ID cards...</div>}>
            <IDCardsTable />
          </Suspense>
        </Card>
      </div>
    </div>
  )
}