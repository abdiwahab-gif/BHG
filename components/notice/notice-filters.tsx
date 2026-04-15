"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter, X } from "lucide-react"
import { NoticeFilters as NoticeFiltersType } from "@/types/notice"
import { useState } from "react"

interface NoticeFiltersProps {
  filters?: NoticeFiltersType
  onFiltersChange?: (filters: NoticeFiltersType) => void
  onClearFilters?: () => void
}

export function NoticeFilters({ 
  filters = {}, 
  onFiltersChange, 
  onClearFilters 
}: NoticeFiltersProps) {
  const [localFilters, setLocalFilters] = useState<NoticeFiltersType>(filters)

  const handleFilterChange = (key: keyof NoticeFiltersType, value: string) => {
    const newFilters = { ...localFilters, [key]: value || undefined }
    setLocalFilters(newFilters)
    onFiltersChange?.(newFilters)
  }

  const handleClearFilters = () => {
    setLocalFilters({})
    onClearFilters?.()
  }

  const hasActiveFilters = Object.values(localFilters).some(value => value !== undefined && value !== '')

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col space-y-4">
          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search notices..."
                value={localFilters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleClearFilters}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select
              value={localFilters.type || ""}
              onValueChange={(value) => handleFilterChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="exam">Exam</SelectItem>
                <SelectItem value="holiday">Holiday</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={localFilters.priority || ""}
              onValueChange={(value) => handleFilterChange('priority', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={localFilters.target || ""}
              onValueChange={(value) => handleFilterChange('target', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Targets</SelectItem>
                <SelectItem value="students">Students</SelectItem>
                <SelectItem value="teachers">Teachers</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="parents">Parents</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="From Date"
              value={localFilters.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />

            <Input
              type="date"
              placeholder="To Date"
              value={localFilters.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}