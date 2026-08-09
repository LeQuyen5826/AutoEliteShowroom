import api from './api'
import type { LoginPayload, RegisterPayload, AuthResponse } from '@/types'
import { refreshAccessToken } from './api'

export const authService = {
  login: async (payload: LoginPayload) => {
    const { data } = await api.post('/auth/login', payload)
    return data.data as AuthResponse
  },

  register: async (payload: RegisterPayload) => {
    const { data } = await api.post('/auth/register', payload)
    return data.data
  },

  forgotPassword: async (email: string) => {
    const { data } = await api.post('/auth/forgot-password', { email })
    return data as { message: string; data?: { dev_reset_url?: string; expires_at?: string } | null }
  },

  resetPassword: async (token: string, password: string) => {
    const { data } = await api.post('/auth/reset-password', { token, password })
    return data
  },

  getMe: async () => {
    const { data } = await api.get('/users/me')
    return data.data
  },

  refresh: refreshAccessToken,

  logout: async () => {
    await api.post('/auth/logout')
  },
}
