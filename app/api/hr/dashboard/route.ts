import { NextRequest, NextResponse } from 'next/server'
import type { HRMetrics, DepartmentMetrics, RecruitmentMetrics } from '@/types/hr'

// Mock HR dashboard data
const mockHRMetrics: HRMetrics = {
  totalEmployees: 847,
  activeEmployees: 823,
  newHires: 23,
  terminations: 7,
  turnoverRate: 8.2,
  averageAge: 32.4,
  averageTenure: 3.2,
  genderDistribution: {
    male: 456,
    female: 367,
    other: 24
  },
  departmentDistribution: [
    {
      department: "Engineering",
      employeeCount: 245,
      avgSalary: 95000,
      turnoverRate: 5.2,
      attendanceRate: 94.8
    },
    {
      department: "Sales",
      employeeCount: 123,
      avgSalary: 67000,
      turnoverRate: 12.1,
      attendanceRate: 91.3
    },
    {
      department: "Marketing",
      employeeCount: 89,
      avgSalary: 72000,
      turnoverRate: 9.8,
      attendanceRate: 93.6
    },
    {
      department: "Human Resources",
      employeeCount: 34,
      avgSalary: 78000,
      turnoverRate: 6.4,
      attendanceRate: 96.2
    },
    {
      department: "Finance",
      employeeCount: 67,
      avgSalary: 82000,
      turnoverRate: 4.1,
      attendanceRate: 95.7
    },
    {
      department: "Operations",
      employeeCount: 156,
      avgSalary: 58000,
      turnoverRate: 11.5,
      attendanceRate: 92.4
    },
    {
      department: "Customer Support",
      employeeCount: 109,
      avgSalary: 45000,
      turnoverRate: 18.3,
      attendanceRate: 89.8
    }
  ],
  attendanceRate: 93.2,
  absenteeismRate: 6.8,
  averageRating: 4.2,
  trainingHours: 1847,
  recruitmentMetrics: {
    openPositions: 34,
    totalApplications: 567,
    avgTimeToHire: 28,
    avgCostPerHire: 3200,
    sourceEffectiveness: [
      {
        source: "LinkedIn",
        applications: 234,
        hires: 12,
        conversionRate: 5.1
      },
      {
        source: "Company Website",
        applications: 156,
        hires: 8,
        conversionRate: 5.1
      },
      {
        source: "Job Boards",
        applications: 89,
        hires: 3,
        conversionRate: 3.4
      },
      {
        source: "Employee Referral",
        applications: 45,
        hires: 9,
        conversionRate: 20.0
      },
      {
        source: "Recruitment Agency",
        applications: 43,
        hires: 4,
        conversionRate: 9.3
      }
    ]
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current'
    
    // In a real application, you would filter data based on the period
    // For now, we'll return the same mock data
    
    return NextResponse.json({
      success: true,
      data: mockHRMetrics
    })
  } catch (error) {
    console.error('Error fetching HR dashboard data:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch HR dashboard data' 
      },
      { status: 500 }
    )
  }
}