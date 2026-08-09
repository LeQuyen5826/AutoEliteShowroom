import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'
import type { User } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

type RefreshResult = { access_token: string; user: User }
let refreshPromise: Promise<RefreshResult> | null = null

async function refreshAccessToken(): Promise<RefreshResult> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true })
      .then(response => response.data.data as RefreshResult)
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise!
}

api.interceptors.response.use(
  response => response,
  async (error) => {
    const original = error.config
    const isAuthEndpoint = typeof original?.url === 'string' && /\/auth\/(login|register|refresh|logout)/.test(original.url)
    if (error.response?.status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true
      try {
        const refreshed = await refreshAccessToken()
        useAuthStore.getState().setAuth(refreshed.user, refreshed.access_token)
        original.headers.Authorization = `Bearer ${refreshed.access_token}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        if (window.location.pathname !== '/login') window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  }
)

export { API_BASE, refreshAccessToken }
export default api
