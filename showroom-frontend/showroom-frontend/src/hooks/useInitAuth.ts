import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/services/auth.service'

export function useInitAuth() {
  const setAuth = useAuthStore(state => state.setAuth)
  const logout = useAuthStore(state => state.logout)
  const setAuthInitialized = useAuthStore(state => state.setAuthInitialized)

  useEffect(() => {
    let active = true
    authService.refresh()
      .then(data => {
        if (active) setAuth(data.user, data.access_token)
      })
      .catch(() => {
        if (active) logout()
      })
      .finally(() => {
        if (active) setAuthInitialized(true)
      })
    return () => { active = false }
  }, [logout, setAuth, setAuthInitialized])
}
