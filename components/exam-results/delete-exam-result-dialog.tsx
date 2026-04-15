"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useDeleteExamResult } from "@/hooks/use-exam-results"
import { Loader2, AlertTriangle, Trash2 } from "lucide-react"

interface DeleteExamResultDialogProps {
  examResultId: string
  studentName?: string
  courseName?: string
  examType?: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function DeleteExamResultDialog({
  examResultId,
  studentName,
  courseName,
  examType,
  isOpen,
  onOpenChange,
  onSuccess,
}: DeleteExamResultDialogProps) {
  const { toast } = useToast()
  const deleteExamResult = useDeleteExamResult()
  const [permanentDelete, setPermanentDelete] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = async () => {
    if (!confirmDelete) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that you want to delete this exam result",
        variant: "destructive",
      })
      return
    }

    try {
      await deleteExamResult.mutateAsync({
        id: examResultId,
        permanent: permanentDelete,
      })

      toast({
        title: "Success",
        description: permanentDelete ? "Exam result permanently deleted" : "Exam result moved to trash",
      })

      onOpenChange(false)
      onSuccess?.()

      setPermanentDelete(false)
      setConfirmDelete(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete exam result",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Exam Result
          </DialogTitle>
          <DialogDescription>This action will remove the exam result from the system.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You are about to delete the exam result for:
              <br />
              <strong>Student:</strong> {studentName || "Unknown"}
              <br />
              <strong>Course:</strong> {courseName || "Unknown"}
              <br />
              <strong>Exam Type:</strong> {examType || "Unknown"}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox id="confirm-delete" checked={confirmDelete} onCheckedChange={setConfirmDelete} />
              <label
                htmlFor="confirm-delete"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I confirm that I want to delete this exam result
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="permanent-delete" checked={permanentDelete} onCheckedChange={setPermanentDelete} />
              <label
                htmlFor="permanent-delete"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Permanent delete (cannot be recovered)
              </label>
            </div>
          </div>

          {permanentDelete && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Permanent deletion cannot be undone. The exam result will be completely
                removed from the system and cannot be recovered.
              </AlertDescription>
            </Alert>
          )}

          {!permanentDelete && (
            <Alert>
              <AlertDescription>
                The exam result will be moved to trash and can be recovered later by an administrator.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleteExamResult.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteExamResult.isPending || !confirmDelete}>
            {deleteExamResult.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {permanentDelete ? "Delete Permanently" : "Move to Trash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
