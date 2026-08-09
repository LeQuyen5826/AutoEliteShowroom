import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  authInitialized: boolean
  setAuth: (user: User, accessToken: string) => void
  setAuthInitialized: (initialized: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  authInitialized: false,

  setAuth: (user, accessToken) => {
    set({ user, accessToken, isAuthenticated: true })
  },

  setAuthInitialized: (authInitialized) => set({ authInitialized }),

  logout: () => {
    set({ user: null, accessToken: null, isAuthenticated: false, authInitialized: true })
  },
}))
