export type NoticeType = 'general' | 'academic' | 'exam' | 'holiday' | 'event' | 'urgent'

export type NoticePriority = 'low' | 'medium' | 'high' | 'urgent'

export type NoticeStatus = 'draft' | 'published' | 'archived'

export type NoticeTarget = 'all' | 'students' | 'teachers' | 'staff' | 'parents'

export interface NoticeAttachment {
  id: string
  name: string
  url: string
  size: number
  type: string
}

export interface Notice {
  id: string
  title: string
  content: string
  type: NoticeType
  priority: NoticePriority
  status: NoticeStatus
  target: NoticeTarget[]
  publishDate: string
  expiryDate?: string
  createdBy: {
    id: string
    name: string
    role: string
  }
  createdAt: string
  updatedAt: string
  attachments?: NoticeAttachment[]
  views: number
  pinned: boolean
}

export interface CreateNoticeRequest {
  title: string
  content: string
  type: NoticeType
  priority: NoticePriority
  target: NoticeTarget[]
  publishDate: string
  expiryDate?: string
  attachments?: File[]
  pinned?: boolean
}

export interface UpdateNoticeRequest extends Partial<CreateNoticeRequest> {
  status?: NoticeStatus
}

export interface NoticeFilters {
  type?: NoticeType
  priority?: NoticePriority
  status?: NoticeStatus
  target?: NoticeTarget
  dateFrom?: string
  dateTo?: string
  search?: string
  createdBy?: string
}

export interface NoticeResponse {
  notices: Notice[]
  total: number
  page: number
  limit: number
}

export interface NoticeStats {
  total: number
  published: number
  draft: number
  archived: number
  urgent: number
  thisMonth: number
}