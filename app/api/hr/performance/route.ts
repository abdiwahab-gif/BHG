import { NextRequest, NextResponse } from 'next/server'
import type { PerformanceReview, Goal, CompetencyRating } from '@/types/hr'

// Mock performance reviews data
const mockPerformanceReviews: PerformanceReview[] = [
  {
    id: "perf001",
    employeeId: "emp001",
    reviewerId: "emp010",
    reviewType: "annual",
    reviewPeriodStart: "2023-10-01",
    reviewPeriodEnd: "2024-09-30",
    status: "completed",
    overallRating: 4.2,
    goals: [
      {
        id: "goal001",
        title: "Increase team productivity",
        description: "Lead initiatives to improve team efficiency by 20%",
        category: "leadership",
        targetDate: "2024-09-30",
        status: "completed",
        progress: 100,
        rating: 5,
        comments: "Exceeded expectations by achieving 25% improvement"
      },
      {
        id: "goal002",
        title: "Complete certification",
        description: "Obtain AWS Solutions Architect certification",
        category: "professional development",
        targetDate: "2024-06-30",
        status: "completed",
        progress: 100,
        rating: 4,
        comments: "Successfully completed certification on time"
      }
    ],
    competencies: [
      {
        competency: "Technical Skills",
        description: "Proficiency in technical aspects of the role",
        rating: 4,
        maxRating: 5,
        comments: "Strong technical abilities with continuous improvement"
      },
      {
        competency: "Communication",
        description: "Ability to communicate effectively with team and clients",
        rating: 5,
        maxRating: 5,
        comments: "Excellent communication skills, both written and verbal"
      },
      {
        competency: "Leadership",
        description: "Ability to lead and influence others",
        rating: 4,
        maxRating: 5,
        comments: "Good leadership potential, shows initiative"
      }
    ],
    achievements: [
      "Led successful migration project",
      "Mentored 3 junior developers",
      "Reduced system downtime by 40%"
    ],
    areasForImprovement: [
      "Time management during peak periods",
      "Cross-functional collaboration"
    ],
    developmentPlan: [
      "Attend project management training",
      "Shadow senior manager for 2 weeks",
      "Lead cross-departmental initiative"
    ],
    reviewerComments: "Outstanding performance this year. Shows great leadership potential and technical expertise.",
    employeeComments: "Thank you for the feedback. I'm committed to working on the improvement areas.",
    createdDate: "2024-09-01T00:00:00Z",
    completedDate: "2024-09-15T00:00:00Z",
    dueDate: "2024-10-15T00:00:00Z"
  },
  {
    id: "perf002",
    employeeId: "emp002",
    reviewerId: "emp010",
    reviewType: "quarterly",
    reviewPeriodStart: "2024-07-01",
    reviewPeriodEnd: "2024-09-30",
    status: "in-progress",
    overallRating: 3.8,
    goals: [
      {
        id: "goal003",
        title: "Improve customer satisfaction",
        description: "Increase customer satisfaction scores by 15%",
        category: "customer service",
        targetDate: "2024-09-30",
        status: "in-progress",
        progress: 75,
        comments: "Good progress, currently at 12% improvement"
      }
    ],
    competencies: [
      {
        competency: "Customer Service",
        description: "Quality of customer interactions and satisfaction",
        rating: 4,
        maxRating: 5,
        comments: "Handles customer issues effectively"
      },
      {
        competency: "Problem Solving",
        description: "Ability to identify and solve complex problems",
        rating: 3,
        maxRating: 5,
        comments: "Good problem-solving skills, room for improvement"
      }
    ],
    achievements: [
      "Resolved 95% of customer issues within SLA",
      "Implemented new customer feedback system"
    ],
    areasForImprovement: [
      "Technical troubleshooting speed",
      "Documentation of procedures"
    ],
    developmentPlan: [
      "Technical training course",
      "Documentation workshop"
    ],
    reviewerComments: "Solid performance with good customer focus. Technical skills need development.",
    createdDate: "2024-09-15T00:00:00Z",
    dueDate: "2024-10-01T00:00:00Z"
  }
]

// Response interface
interface PerformanceResponse {
  reviews: PerformanceReview[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const employeeId = searchParams.get('employeeId') || ''
    const reviewType = searchParams.get('reviewType') || ''
    const status = searchParams.get('status') || ''

    let filteredReviews = mockPerformanceReviews

    // Apply filters
    if (employeeId) {
      filteredReviews = filteredReviews.filter(review => review.employeeId === employeeId)
    }

    if (reviewType && reviewType !== 'all') {
      filteredReviews = filteredReviews.filter(review => review.reviewType === reviewType)
    }

    if (status && status !== 'all') {
      filteredReviews = filteredReviews.filter(review => review.status === status)
    }

    // Calculate pagination
    const total = filteredReviews.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedReviews = filteredReviews.slice(startIndex, endIndex)

    const response: PerformanceResponse = {
      reviews: paginatedReviews,
      total,
      page,
      limit,
      totalPages
    }

    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('Error fetching performance reviews:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch performance reviews' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const reviewData = await request.json()
    
    if (!reviewData.employeeId || !reviewData.reviewerId || !reviewData.reviewType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Employee ID, reviewer ID, and review type are required' 
        },
        { status: 400 }
      )
    }

    const newReview: PerformanceReview = {
      id: `perf${(mockPerformanceReviews.length + 1).toString().padStart(3, '0')}`,
      employeeId: reviewData.employeeId,
      reviewerId: reviewData.reviewerId,
      reviewType: reviewData.reviewType,
      reviewPeriodStart: reviewData.reviewPeriodStart || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reviewPeriodEnd: reviewData.reviewPeriodEnd || new Date().toISOString().split('T')[0],
      status: "not-started",
      overallRating: 0,
      goals: reviewData.goals || [],
      competencies: reviewData.competencies || [],
      achievements: reviewData.achievements || [],
      areasForImprovement: reviewData.areasForImprovement || [],
      developmentPlan: reviewData.developmentPlan || [],
      reviewerComments: reviewData.reviewerComments || "",
      employeeComments: reviewData.employeeComments || "",
      createdDate: new Date().toISOString(),
      dueDate: reviewData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }

    mockPerformanceReviews.push(newReview)

    return NextResponse.json({
      success: true,
      data: newReview,
      message: 'Performance review created successfully'
    })
  } catch (error) {
    console.error('Error creating performance review:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create performance review' 
      },
      { status: 500 }
    )
  }
}