import api from './api'
import type { Review } from '@/types'

export const reviewsService = {
  create: async (carId: string, payload: { rating: number; comment?: string }) => {
    const { data } = await api.post(`/cars/${carId}/reviews`, payload)
    return data.data as Review
  },

  getAll: async (params: { page?: number; limit?: number; visibility?: 'visible' | 'hidden' | ''; rating?: number | '' } = {}) => {
    const query = new URLSearchParams()
    if (params.visibility) query.append('visibility', params.visibility)
    if (params.rating) query.append('rating', String(params.rating))
    query.append('page', String(params.page ?? 1))
    query.append('limit', String(params.limit ?? 20))
    const { data } = await api.get(`/reviews?${query}`)
    return data.data as {
      reviews: Review[]
      pagination: { total: number; page: number; limit: number; totalPages: number }
    }
  },

  toggleVisibility: async (id: string) => {
    const { data } = await api.patch(`/reviews/${id}/visibility`)
    return data.data as Review
  },
}
