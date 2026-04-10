// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
}

export interface PaginationResponse {
  page: number
  limit: number
  total: number
  totalPages: number
}
