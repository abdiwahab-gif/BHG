"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useExamResult, useUpdateExamResult } from "@/hooks/use-exam-results"
import { Loader2, AlertTriangle } from "lucide-react"

const examResultSchema = z.object({
  score: z.number().min(0, "Score must be non-negative"),
  maxScore: z.number().min(1, "Max score must be positive"),
  comments: z.string().optional(),
})

type ExamResultFormData = z.infer<typeof examResultSchema>

interface EditExamResultFormProps {
  examResultId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function EditExamResultForm({ examResultId, onSuccess, onCancel }: EditExamResultFormProps) {
  const { toast } = useToast()
  const { data: examResult, isLoading, error } = useExamResult(examResultId)
  const updateExamResult = useUpdateExamResult()
  const [hasChanges, setHasChanges] = useState(false)

  const result = examResult?.data

  const form = useForm<ExamResultFormData>({
    resolver: zodResolver(examResultSchema),
    defaultValues: {
      score: 0,
      maxScore: 100,
      comments: "",
    },
  })

  useEffect(() => {
    if (result) {
      form.reset({
        score: Number(result.score || 0),
        maxScore: Number(result.maxScore || 0),
        comments: result.comments || "",
      })
    }
  }, [result, form])

  useEffect(() => {
    const subscription = form.watch(() => {
      setHasChanges(true)
    })
    return () => subscription.unsubscribe()
  }, [form])

  const onSubmit = async (data: ExamResultFormData) => {
    try {
      await updateExamResult.mutateAsync({
        id: examResultId,
        data: {
          score: data.score,
          maxScore: data.maxScore,
          comments: data.comments,
        },
      })
      toast({
        title: "Success",
        description: "Exam result updated successfully",
      })
      setHasChanges(false)
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update exam result",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Failed to load exam result. Please try again.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Edit Exam Result</CardTitle>
        <CardDescription>
          {result?.studentName ? `${result.studentName} · ` : ""}
          {result?.courseName ? `${result.courseName} · ` : ""}
          {result?.examTypeName || ""}
        </CardDescription>
        {hasChanges && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. All modifications will be logged for audit purposes.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
        {result?.enteredAt || result?.enteredBy || result?.modifiedAt || result?.modifiedBy ? (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium">Entered</div>
              <div className="text-sm text-muted-foreground">{result?.enteredBy || "-"}</div>
              <div className="text-xs text-muted-foreground">
                {result?.enteredAt ? new Date(result.enteredAt).toLocaleString() : "-"}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Last Modified</div>
              <div className="text-sm text-muted-foreground">{result?.modifiedBy || "-"}</div>
              <div className="text-xs text-muted-foreground">
                {result?.modifiedAt ? new Date(result.modifiedAt).toLocaleString() : "-"}
              </div>
            </div>
          </div>
        ) : null}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Student Gender</div>
                <Input value={result?.studentGender ? String(result.studentGender) : ""} disabled />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Course Code</div>
                <Input value={result?.courseCode ? String(result.courseCode) : ""} disabled />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Course Credits</div>
                <Input
                  value={
                    result?.courseCredits === null || result?.courseCredits === undefined
                      ? ""
                      : String(result.courseCredits)
                  }
                  disabled
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Faculty</div>
                <Input value={result?.courseFaculty ? String(result.courseFaculty) : ""} disabled />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Department</div>
                <Input value={result?.courseDepartment ? String(result.courseDepartment) : ""} disabled />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter score"
                        {...field}
                        onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Score</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter max score"
                        {...field}
                        onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comments (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter any additional comments" className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={updateExamResult.isPending || !hasChanges}>
                {updateExamResult.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Result
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
