"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  Pin, 
  PinOff,
  Calendar,
  User,
  Target,
  Download
} from "lucide-react"
import { useNotices } from "@/hooks/use-notices"
import { Notice, NoticeStatus, NoticePriority } from "@/types/notice"
import { formatDistanceToNow, format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NoticeDetail } from "./notice-detail"

interface NoticeListProps {
  status?: NoticeStatus
  priority?: NoticePriority
}

const getPriorityColor = (priority: NoticePriority) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getStatusColor = (status: NoticeStatus) => {
  switch (status) {
    case 'published':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'draft':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'archived':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'exam':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'academic':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'event':
      return 'bg-pink-100 text-pink-800 border-pink-200'
    case 'holiday':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case "general":
      return "Announcement"
    case "academic":
      return "Community Update"
    case "exam":
      return "Meeting"
    case "holiday":
      return "Holiday"
    case "event":
      return "Event"
    case "urgent":
      return "Urgent"
    default:
      return type
  }
}

const getTargetLabel = (target: string) => {
  switch (target) {
    case "all":
      return "Everyone"
    case "students":
      return "Community Members"
    case "teachers":
      return "Volunteers"
    case "staff":
      return "Organizers"
    case "parents":
      return "Partners"
    default:
      return target
  }
}

export function NoticeList({ status, priority }: NoticeListProps) {
  const { notices, loading, error } = useNotices({
    initialFilters: { status, priority }
  })
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  const handleViewNotice = (notice: Notice) => {
    setSelectedNotice(notice)
    setIsDetailDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Failed to load notices: {error}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (notices.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No notices found matching your criteria.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {notices.map((notice) => (
          <Card key={notice.id} className={notice.pinned ? "border-orange-200 bg-orange-50/50" : ""}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2">
                    {notice.pinned && (
                      <Pin className="h-4 w-4 text-orange-600" />
                    )}
                    <h3 className="font-semibold text-lg leading-tight">
                      {notice.title}
                    </h3>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={getPriorityColor(notice.priority)}>
                      {notice.priority}
                    </Badge>
                    <Badge className={getStatusColor(notice.status)}>
                      {notice.status}
                    </Badge>
                    <Badge className={getTypeColor(notice.type)}>{getTypeLabel(notice.type)}</Badge>
                    <span className="text-sm text-muted-foreground flex items-center">
                      <Target className="h-3 w-3 mr-1" />
                      {notice.target.map(getTargetLabel).join(", ")}
                    </span>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewNotice(notice)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      {notice.pinned ? (
                        <>
                          <PinOff className="h-4 w-4 mr-2" />
                          Unpin
                        </>
                      ) : (
                        <>
                          <Pin className="h-4 w-4 mr-2" />
                          Pin
                        </>
                      )}
                    </DropdownMenuItem>
                    {notice.attachments && notice.attachments.length > 0 && (
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Download Attachments
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                {notice.content}
              </p>
              
              <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {notice.createdBy.name}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(notice.publishDate), 'MMM dd, yyyy')}
                  </span>
                  <span className="flex items-center">
                    <Eye className="h-3 w-3 mr-1" />
                    {notice.views} views
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {notice.attachments && notice.attachments.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {notice.attachments.length} attachment{notice.attachments.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {notice.expiryDate && (
                    <span className="text-xs">
                      Expires {formatDistanceToNow(new Date(notice.expiryDate), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notice Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notice Details</DialogTitle>
            <DialogDescription>
              View complete notice information and attachments
            </DialogDescription>
          </DialogHeader>
          {selectedNotice && (
            <NoticeDetail notice={selectedNotice} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}