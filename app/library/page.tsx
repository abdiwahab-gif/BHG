"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Book, 
  Users, 
  Calendar, 
  AlertTriangle, 
  BookOpen, 
  UserPlus, 
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Library,
  Clock
} from "lucide-react"

import { LibraryStats } from "@/components/library/library-stats"
import { LibraryBooks } from "@/components/library/library-books"
import { LibraryBorrows } from "@/components/library/library-borrows"
import { LibraryMembers } from "@/components/library/library-members"
import { LibraryFines } from "@/components/library/library-fines"
import { LibraryReports } from "@/components/library/library-reports"

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState("dashboard")

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Library Management</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Search className="mr-2 h-4 w-4" />
            Quick Search
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Library className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="books" className="flex items-center gap-2">
            <Book className="h-4 w-4" />
            Books
          </TabsTrigger>
          <TabsTrigger value="borrows" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Borrows
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="fines" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Fines
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <LibraryStats />
        </TabsContent>

        <TabsContent value="books" className="space-y-4">
          <LibraryBooks />
        </TabsContent>

        <TabsContent value="borrows" className="space-y-4">
          <LibraryBorrows />
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <LibraryMembers />
        </TabsContent>

        <TabsContent value="fines" className="space-y-4">
          <LibraryFines />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <LibraryReports />
        </TabsContent>
      </Tabs>
    </div>
  )
}