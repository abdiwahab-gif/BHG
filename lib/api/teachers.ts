// Teacher API client functions using React Query

export interface Teacher {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  gender: "Male" | "Female"
  nationality: string
  address: string
  address2?: string
  city: string
  zip: string
  photo?: string
  subjects?: string[]
  qualifications?: string[]
  experience?: string
  joiningDate?: string
  salary?: number
  status: "Active" | "Inactive"
  createdAt: string
  updatedAt: string
}

export interface TeachersResponse {
  teachers: Teacher[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  filters: {
    search?: string
    gender?: string
    status?: string
    subject?: string
  }
}

export interface CreateTeacherData {
  firstName: string
  lastName: string
  email: string
  phone: string
  gender: "Male" | "Female"
  nationality: string
  address: string
  address2?: string
  city: string
  zip: string
  photo?: string
  subjects?: string[]
  qualifications?: string[]
  experience?: string
  joiningDate?: string
  salary?: number
}

export interface TeacherFilters {
  page?: number
  limit?: number
  search?: string
  gender?: string
  status?: string
  subject?: string
}

// API client functions
export const teachersApi = {
  // Get all teachers with filters
  getTeachers: async (filters: TeacherFilters = {}): Promise<TeachersResponse> => {
    const params = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value.toString())
      }
    })

    const response = await fetch(`/api/teachers?${params.toString()}`)

    if (!response.ok) {
      throw new Error("Failed to fetch teachers")
    }

    return response.json()
  },

  // Get single teacher by ID
  getTeacher: async (id: string): Promise<{ teacher: Teacher }> => {
    const response = await fetch(`/api/teachers/${id}`)

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Teacher not found")
      }
      throw new Error("Failed to fetch teacher")
    }

    return response.json()
  },

  // Create new teacher
  createTeacher: async (data: CreateTeacherData): Promise<{ teacher: Teacher; message: string }> => {
    const response = await fetch("/api/teachers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to create teacher")
    }

    return response.json()
  },

  // Update teacher
  updateTeacher: async (
    id: string,
    data: Partial<CreateTeacherData>,
  ): Promise<{ teacher: Teacher; message: string }> => {
    const response = await fetch(`/api/teachers/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to update teacher")
    }

    return response.json()
  },

  // Delete teacher
  deleteTeacher: async (id: string): Promise<{ teacher: Teacher; message: string }> => {
    const response = await fetch(`/api/teachers/${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to delete teacher")
    }

    return response.json()
  },
}
