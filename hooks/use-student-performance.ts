import { useQuery } from "@tanstack/react-query"

interface StudentPerformanceParams {
  studentId?: string
  sessionId: string
  semesterId: string
}

export function useStudentPerformance(params: StudentPerformanceParams) {
  return useQuery({
    queryKey: ["student-performance", params],
    queryFn: async () => {
      if (!params.studentId) return null

      const response = await fetch(
        `/api/analytics/student-performance/${params.studentId}?sessionId=${params.sessionId}&semesterId=${params.semesterId}`,
      )
      if (!response.ok) throw new Error("Failed to fetch student performance")
      return response.json()
    },
    enabled: !!params.studentId,
  })
}
