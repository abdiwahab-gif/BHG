"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NoticeList } from "@/components/notice/notice-list"
import { NoticeStats } from "@/components/notice/notice-stats"
import { CreateNoticeForm } from "@/components/notice/create-notice-form"
import { NoticeFilters } from "@/components/notice/notice-filters"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function NoticePage() {
  const [activeTab, setActiveTab] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notice Board</h1>
          <p className="text-muted-foreground">Manage and publish updates for your community</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Notice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Notice</DialogTitle>
              <DialogDescription>Create and publish a new notice for the community</DialogDescription>
            </DialogHeader>
            <CreateNoticeForm onSuccess={() => setIsCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <NoticeStats />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Notices</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="urgent">Urgent</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <NoticeFilters />
          <NoticeList />
        </TabsContent>

        <TabsContent value="published" className="space-y-6">
          <NoticeFilters />
          <NoticeList status="published" />
        </TabsContent>

        <TabsContent value="draft" className="space-y-6">
          <NoticeFilters />
          <NoticeList status="draft" />
        </TabsContent>

        <TabsContent value="urgent" className="space-y-6">
          <NoticeFilters />
          <NoticeList priority="urgent" />
        </TabsContent>

        <TabsContent value="archived" className="space-y-6">
          <NoticeFilters />
          <NoticeList status="archived" />
        </TabsContent>
      </Tabs>
    </div>
  )
}