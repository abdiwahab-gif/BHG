'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Clock, Calendar } from 'lucide-react'
import { useAttendance } from '@/hooks/use-hr'
import { useToast } from '@/hooks/use-toast'

export function HRAttendanceTab() {
  const { 
    attendance, 
    total, 
    loading, 
    error, 
    fetchAttendance, 
    createAttendance 
  } = useAttendance()

  const { toast } = useToast()
  const [isSyncingBiometric, setIsSyncingBiometric] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const pullAndSync = async () => {
    setIsSyncingBiometric(true)
    try {
      // 1) Ask backend to queue a device upload (iClock pull command).
      // If deviceId isn't configured, this may return 400; we still allow sync to run.
      const pullResp = await fetch('/api/hr/attendance/pull-device', { method: 'POST' })
      const pullRaw = await pullResp.text()
      let pullJson: any = null
      try {
        pullJson = pullRaw ? JSON.parse(pullRaw) : null
      } catch {
        pullJson = null
      }

      // 2) Import available punches into HR attendance events.
      const syncResp = await fetch('/api/hr/attendance/sync-zkteco', { method: 'POST' })
      const syncJson = await syncResp.json().catch(() => null)

      if (!syncResp.ok || !syncJson?.success) {
        const msg = syncJson?.error || syncJson?.message || 'Failed to sync biometric logs'
        toast({ title: 'Sync Failed', description: msg, variant: 'destructive' })
        return
      }

      const inserted = Number(syncJson?.data?.inserted ?? 0)
      const matched = Number(syncJson?.data?.matched ?? 0)

      if (!pullResp.ok) {
        const pullMsg = pullJson?.error || pullJson?.message || 'Device upload request was not sent (missing deviceId?)'
        toast({
          title: 'Synced Existing Logs',
          description: `${inserted} new event(s) imported (matched ${matched}). ${pullMsg}`,
        })
      } else {
        toast({
          title: 'Fingerprint Sync Started',
          description: `${inserted} new event(s) imported (matched ${matched}). If your device is online, more logs may arrive shortly — click again to import them.`,
        })
      }

      // Refresh table
      fetchAttendance({
        page: currentPage,
        limit: 10,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        dateFrom: dateFromFilter || undefined,
        dateTo: dateToFilter || undefined,
      })
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.message || 'Failed to pull/sync fingerprint logs',
        variant: 'destructive',
      })
    } finally {
      setIsSyncingBiometric(false)
    }
  }

  useEffect(() => {
    fetchAttendance({
      page: currentPage,
      limit: 10,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      dateFrom: dateFromFilter || undefined,
      dateTo: dateToFilter || undefined,
    })
  }, [fetchAttendance, currentPage, statusFilter, dateFromFilter, dateToFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-amber-100 text-amber-800'
      case 'absent': return 'bg-red-100 text-red-800'
      case 'late': return 'bg-yellow-100 text-yellow-800'
      case 'half-day': return 'bg-blue-100 text-blue-800'
      case 'holiday': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Attendance</h2>
          <p className="text-muted-foreground">
            Track employee attendance and working hours
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={pullAndSync} disabled={isSyncingBiometric}>
            {isSyncingBiometric ? (
              <span className="inline-flex items-center">
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                Syncing...
              </span>
            ) : (
              'Pull Fingerprint Logs'
            )}
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Mark Attendance
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="half-day">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input
                type="date"
                placeholder="From Date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <Input
                type="date"
                placeholder="To Date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Attendance Records</CardTitle>
            <div className="text-sm text-muted-foreground">
              {total} records found
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading attendance...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Hours Worked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.employeeId}</TableCell>
                    <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : '-'}
                    </TableCell>
                    <TableCell>
                      {record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : '-'}
                    </TableCell>
                    <TableCell>{record.hoursWorked.toFixed(2)}h</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(record.status)}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{record.location}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && !error && attendance.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No attendance records found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}