"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, X } from "lucide-react"
import type { StudentFilters } from "@/lib/api/students"
import { useClasses } from "@/hooks/use-classes"

interface AdvancedSearchProps {
  filters: StudentFilters
  onFiltersChange: (filters: StudentFilters) => void
  onClearFilters: () => void
}

interface SearchCriteria {
  search: string
  class: string
  section: string
  gender: string
  status: string
  bloodType: string
  nationality: string
  city: string
}

export function AdvancedSearch({ filters, onFiltersChange, onClearFilters }: AdvancedSearchProps) {
  const [open, setOpen] = useState(false)
  const { data: classesData } = useClasses()
  const [criteria, setCriteria] = useState<SearchCriteria>({
    search: filters.search || "",
    class: filters.class || "all",
    section: filters.section || "all",
    gender: filters.gender || "all",
    status: filters.status || "all",
    bloodType: filters.bloodType || "",
    nationality: filters.nationality || "",
    city: filters.city || "",
  })

  const handleApplyFilters = () => {
    const newFilters: StudentFilters = {}

    if (criteria.search) newFilters.search = criteria.search
    if (criteria.class !== "all") newFilters.class = criteria.class
    if (criteria.section !== "all") newFilters.section = criteria.section
    if (criteria.gender !== "all") newFilters.gender = criteria.gender
    if (criteria.status !== "all") newFilters.status = criteria.status
    if (criteria.bloodType) newFilters.bloodType = criteria.bloodType
    if (criteria.nationality) newFilters.nationality = criteria.nationality
    if (criteria.city) newFilters.city = criteria.city

    onFiltersChange(newFilters)
    setOpen(false)
  }

  const handleClearAll = () => {
    setCriteria({
      search: "",
      class: "all",
      section: "all",
      gender: "all",
      status: "all",
      bloodType: "",
      nationality: "",
      city: "",
    })
    onClearFilters()
    setOpen(false)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.search) count++
    if (filters.class && filters.class !== "all") count++
    if (filters.section && filters.section !== "all") count++
    if (filters.gender && filters.gender !== "all") count++
    if (filters.status && filters.status !== "all") count++
    if (filters.bloodType) count++
    if (filters.nationality) count++
    if (filters.city) count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  const classOptions = Array.from(new Set((classesData || []).map((c: any) => String(c.name)).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b)
  )
  const sectionOptions = (() => {
    if (criteria.class !== "all") {
      const selected = (classesData || []).find((c: any) => String(c.name) === String(criteria.class))
      const selectedSections = (selected?.sections || []).map((s: any) => String(s.name))
      return Array.from(new Set(selectedSections.filter(Boolean))).sort((a, b) => a.localeCompare(b))
    }
    const allSections = (classesData || []).flatMap((c: any) => (c.sections || []).map((s: any) => String(s.name)))
    return Array.from(new Set(allSections.filter(Boolean))).sort((a, b) => a.localeCompare(b))
  })()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative bg-transparent">
          <Filter className="h-4 w-4 mr-2" />
          Advanced Search
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Advanced Search</DialogTitle>
          <DialogDescription>Use multiple criteria to find specific students.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Text</Label>
            <Input
              id="search"
              placeholder="Name, email, phone, or student ID..."
              value={criteria.search}
              onChange={(e) => setCriteria((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>

          {/* Class Filter */}
          <div className="space-y-2">
            <Label>Class</Label>
            <Select
              value={criteria.class}
              onValueChange={(value) => setCriteria((prev) => ({ ...prev, class: value, section: "all" }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section Filter */}
          <div className="space-y-2">
            <Label>Section</Label>
            <Select
              value={criteria.section}
              onValueChange={(value) => setCriteria((prev) => ({ ...prev, section: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sectionOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Gender Filter */}
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={criteria.gender}
              onValueChange={(value) => setCriteria((prev) => ({ ...prev, gender: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={criteria.status}
              onValueChange={(value) => setCriteria((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Blood Type Filter */}
          <div className="space-y-2">
            <Label>Blood Type</Label>
            <Select
              value={criteria.bloodType}
              onValueChange={(value) => setCriteria((prev) => ({ ...prev, bloodType: value === "any" ? "" : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any blood type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any blood type</SelectItem>
                <SelectItem value="A+">A+</SelectItem>
                <SelectItem value="A-">A-</SelectItem>
                <SelectItem value="B+">B+</SelectItem>
                <SelectItem value="B-">B-</SelectItem>
                <SelectItem value="AB+">AB+</SelectItem>
                <SelectItem value="AB-">AB-</SelectItem>
                <SelectItem value="O+">O+</SelectItem>
                <SelectItem value="O-">O-</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nationality Filter */}
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Input
              id="nationality"
              placeholder="Enter nationality..."
              value={criteria.nationality}
              onChange={(e) => setCriteria((prev) => ({ ...prev, nationality: e.target.value }))}
            />
          </div>

          {/* City Filter */}
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="Enter city..."
              value={criteria.city}
              onChange={(e) => setCriteria((prev) => ({ ...prev, city: e.target.value }))}
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="space-y-2">
            <Label>Active Filters</Label>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: {filters.search}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => onFiltersChange({ ...filters, search: undefined })}
                  />
                </Badge>
              )}
              {filters.class && filters.class !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Class: {filters.class}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => onFiltersChange({ ...filters, class: undefined })}
                  />
                </Badge>
              )}
              {filters.section && filters.section !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Section: {filters.section}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => onFiltersChange({ ...filters, section: undefined })}
                  />
                </Badge>
              )}
              {filters.gender && filters.gender !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Gender: {filters.gender}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => onFiltersChange({ ...filters, gender: undefined })}
                  />
                </Badge>
              )}
              {filters.status && filters.status !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {filters.status}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => onFiltersChange({ ...filters, status: undefined })}
                  />
                </Badge>
              )}
              {filters.bloodType && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Blood Type: {filters.bloodType}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => onFiltersChange({ ...filters, bloodType: undefined })}
                  />
                </Badge>
              )}
              {filters.nationality && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Nationality: {filters.nationality}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => onFiltersChange({ ...filters, nationality: undefined })}
                  />
                </Badge>
              )}
              {filters.city && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  City: {filters.city}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => onFiltersChange({ ...filters, city: undefined })}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClearAll}>
            Clear All
          </Button>
          <Button onClick={handleApplyFilters}>
            <Search className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
