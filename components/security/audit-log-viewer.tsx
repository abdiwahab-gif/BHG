"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Eye, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuditLogs } from "@/hooks/use-audit-logs"

export function AuditLogViewer() {
  const [filters, setFilters] = useState({
    entityType: "ALL_TYPES",
    action: "ALL_ACTIONS",
    dateFrom: "",
    dateTo: "",
    page: 1,
    limit: 50,
  })

  const { data: auditData, isLoading, error } = useAuditLogs(filters)

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filtering
    }))
  }

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "CREATE":
        return "default"
      case "UPDATE":
        return "secondary"
      case "DELETE":
        return "destructive"
      case "PUBLISH":
        return "default"
      case "UNPUBLISH":
        return "secondary"
      default:
        return "outline"
    }
  }

  const exportAuditLogs = () => {
    // Implementation for exporting audit logs
    console.log("Exporting audit logs...")
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load audit logs</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>Track all system activities and changes</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <Select value={filters.entityType} onValueChange={(value) => handleFilterChange("entityType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_TYPES">All Types</SelectItem>
                  <SelectItem value="EXAM_RESULT">Exam Results</SelectItem>
                  <SelectItem value="GRADING_SYSTEM">Grading Systems</SelectItem>
                  <SelectItem value="GRADE_MAPPING">Grade Mappings</SelectItem>
                  <SelectItem value="USER">Users</SelectItem>
                  <SelectItem value="STUDENT">Students</SelectItem>
                  <SelectItem value="MEMBER">Members</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={filters.action} onValueChange={(value) => handleFilterChange("action", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_ACTIONS">All Actions</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                  <SelectItem value="PUBLISH">Publish</SelectItem>
                  <SelectItem value="UNPUBLISH">Unpublish</SelectItem>
                  <SelectItem value="ACCESS">Access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={exportAuditLogs} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Audit Logs Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : auditData?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  auditData?.data?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.timestamp), "MMM dd, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.userName}</div>
                          <div className="text-sm text-muted-foreground">{log.userRole}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)}>{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.entityType}</div>
                          <div className="text-sm text-muted-foreground font-mono">{log.entityId}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.ipAddress}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Audit Log Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Timestamp</label>
                                  <p className="text-sm font-mono">
                                    {format(new Date(log.timestamp), "MMM dd, yyyy HH:mm:ss")}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">User Agent</label>
                                  <p className="text-sm font-mono truncate">{log.userAgent}</p>
                                </div>
                              </div>

                              {log.oldValues && (
                                <div>
                                  <label className="text-sm font-medium">Old Values</label>
                                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                                    {JSON.stringify(log.oldValues, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.newValues && (
                                <div>
                                  <label className="text-sm font-medium">New Values</label>
                                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                                    {JSON.stringify(log.newValues, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.reason && (
                                <div>
                                  <label className="text-sm font-medium">Reason</label>
                                  <p className="text-sm">{log.reason}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {auditData?.pagination && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(auditData.pagination.page - 1) * auditData.pagination.limit + 1} to{" "}
                {Math.min(auditData.pagination.page * auditData.pagination.limit, auditData.pagination.total)} of{" "}
                {auditData.pagination.total} entries
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={auditData.pagination.page === 1}
                  onClick={() => handleFilterChange("page", (auditData.pagination.page - 1).toString())}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={auditData.pagination.page >= auditData.pagination.totalPages}
                  onClick={() => handleFilterChange("page", (auditData.pagination.page + 1).toString())}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
