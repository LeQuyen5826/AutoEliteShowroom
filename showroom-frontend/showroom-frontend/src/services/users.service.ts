import api from './api'
import type { User, Role, CustomerWithCounts } from '@/types'

export interface UserListParams {
  role?: Role | ''
  page?: number
  limit?: number
}

export interface CreateStaffPayload {
  full_name: string
  email: string
  password: string
  phone?: string
  branch_id?: string
}

export const usersService = {
  // (Admin) Danh sách người dùng, lọc theo vai trò + phân trang
  getAll: async (params: UserListParams = {}) => {
    const query = new URLSearchParams()
    if (params.role) query.append('role', params.role)
    query.append('page', String(params.page ?? 1))
    query.append('limit', String(params.limit ?? 20))
    const { data } = await api.get(`/users?${query}`)
    return data.data as { users: User[]; pagination: { total: number; page: number; limit: number; totalPages: number } }
  },

  // (Admin) Tạo tài khoản nhân viên mới
  createStaff: async (payload: CreateStaffPayload) => {
    const { data } = await api.post('/users/staff', payload)
    return data.data as User
  },

  getCustomers: async (params: { search?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams()
    if (params.search) query.append('search', params.search)
    query.append('page', String(params.page ?? 1))
    query.append('limit', String(params.limit ?? 20))
    const { data } = await api.get(`/users/customers?${query}`)
    return data.data as {
      customers: CustomerWithCounts[]
      pagination: { total: number; page: number; limit: number; totalPages: number }
    }
  },

  getMe: async () => {
    const { data } = await api.get('/users/me')
    return data.data as User
  },
}
