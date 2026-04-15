"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Trash2, UserCheck, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BulkActionsProps {
  selectedStudents: string[]
  onBulkDelete: (ids: string[]) => void
  onBulkStatusUpdate: (ids: string[], status: string) => void
  onClearSelection: () => void
}

export function BulkActions({
  selectedStudents,
  onBulkDelete,
  onBulkStatusUpdate,
  onClearSelection,
}: BulkActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  if (selectedStudents.length === 0) {
    return null
  }

  const handleBulkDelete = async () => {
    setIsProcessing(true)
    try {
      await onBulkDelete(selectedStudents)
      setShowDeleteDialog(false)
      onClearSelection()
      toast({
        title: "Success",
        description: `${selectedStudents.length} students deleted successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete students",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkStatusUpdate = async () => {
    if (!selectedStatus) return

    setIsProcessing(true)
    try {
      await onBulkStatusUpdate(selectedStudents, selectedStatus)
      setShowStatusDialog(false)
      setSelectedStatus("")
      onClearSelection()
      toast({
        title: "Success",
        description: `${selectedStudents.length} students status updated successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update student status",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="text-sm font-medium">{selectedStudents.length} students selected</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowStatusDialog(true)}>
            <UserCheck className="h-4 w-4 mr-2" />
            Update Status
          </Button>

          <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>

          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Clear Selection
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Students</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedStudents.length} selected students? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isProcessing}>
              {isProcessing ? "Deleting..." : "Delete Students"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Student Status</DialogTitle>
            <DialogDescription>
              Select the new status for {selectedStudents.length} selected students.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Active</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="inactive">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Inactive</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="suspended">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Suspended</Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleBulkStatusUpdate} disabled={isProcessing || !selectedStatus}>
              {isProcessing ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
