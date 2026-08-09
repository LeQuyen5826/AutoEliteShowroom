import api from './api'
import type { ContactLead, ContactStatus } from '@/types'

export const contactsService = {
  getAll: async (params: { status?: ContactStatus | ''; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams()
    if (params.status) query.append('status', params.status)
    query.append('page', String(params.page ?? 1))
    query.append('limit', String(params.limit ?? 20))
    const { data } = await api.get(`/contact?${query}`)
    return data.data as {
      leads: ContactLead[]
      pagination: { total: number; page: number; limit: number; totalPages: number }
    }
  },

  updateStatus: async (id: string, status: ContactStatus) => {
    const { data } = await api.patch(`/contact/${id}/status`, { status })
    return data.data as ContactLead
  },
}
