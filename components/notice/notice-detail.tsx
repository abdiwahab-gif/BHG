"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Notice } from "@/types/notice"
import { format } from "date-fns"
import { 
  Calendar, 
  User, 
  Target, 
  Eye, 
  Download,
  Clock,
  AlertTriangle
} from "lucide-react"

interface NoticeDetailProps {
  notice: Notice
}

const getPriorityColor = (priority: string) => {
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

const getStatusColor = (status: string) => {
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

export function NoticeDetail({ notice }: NoticeDetailProps) {
  const isExpired = notice.expiryDate && new Date(notice.expiryDate) < new Date()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="text-2xl font-bold leading-tight">{notice.title}</h2>
          {notice.pinned && (
            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
              Pinned
            </Badge>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={getPriorityColor(notice.priority)}>
            {notice.priority}
          </Badge>
          <Badge className={getStatusColor(notice.status)}>
            {notice.status}
          </Badge>
          <Badge className={getTypeColor(notice.type)}>
            {notice.type}
          </Badge>
          {isExpired && (
            <Badge className="bg-red-100 text-red-800 border-red-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Expired
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Notice Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap">{notice.content}</p>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Publication Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center text-sm">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground mr-2">Published:</span>
              <span>{format(new Date(notice.publishDate), 'MMM dd, yyyy \'at\' hh:mm a')}</span>
            </div>
            
            {notice.expiryDate && (
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-2">Expires:</span>
                <span className={isExpired ? 'text-red-600' : ''}>
                  {format(new Date(notice.expiryDate), 'MMM dd, yyyy \'at\' hh:mm a')}
                </span>
              </div>
            )}
            
            <div className="flex items-center text-sm">
              <User className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground mr-2">Created by:</span>
              <span>{notice.createdBy.name}</span>
            </div>
            
            <div className="flex items-center text-sm">
              <span className="text-muted-foreground mr-2">Role:</span>
              <span>{notice.createdBy.role}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Audience & Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center text-sm">
              <Target className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground mr-2">Target:</span>
              <span>{notice.target.join(', ')}</span>
            </div>
            
            <div className="flex items-center text-sm">
              <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground mr-2">Views:</span>
              <span>{notice.views.toLocaleString()}</span>
            </div>
            
            <div className="text-sm">
              <span className="text-muted-foreground mr-2">Last updated:</span>
              <span>{format(new Date(notice.updatedAt), 'MMM dd, yyyy \'at\' hh:mm a')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attachments */}
      {notice.attachments && notice.attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notice.attachments.map((attachment) => (
                <div 
                  key={attachment.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded">
                      <Download className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{attachment.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(attachment.size / 1024).toFixed(1)} KB • {attachment.type}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}