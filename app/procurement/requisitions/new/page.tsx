import { Suspense } from "react"
import { CreateRequisitionForm } from "@/components/procurement/requisitions/create-requisition-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function NewRequisitionPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/procurement">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Procurement
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Requisition</h1>
          <p className="text-gray-500">
            Create a new procurement requisition request
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Requisition Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="h-96 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
              <span className="text-gray-500">Loading form...</span>
            </div>
          }>
            <CreateRequisitionForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}