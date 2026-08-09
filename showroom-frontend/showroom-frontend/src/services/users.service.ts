import api from './api'
import type { User, Role } from '@/types'

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

  getMe: async () => {
    const { data } = await api.get('/users/me')
    return data.data as User
  },
}
