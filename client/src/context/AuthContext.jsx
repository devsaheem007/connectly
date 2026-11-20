import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState({ googleClientId: null, demoLogin: false, emailConfigured: false })

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [cfg, me] = await Promise.allSettled([api.get('/auth/config'), api.get('/auth/me')])
      if (!alive) return
      if (cfg.status === 'fulfilled') setConfig(cfg.value.data)
      if (me.status === 'fulfilled') setUser(me.value.data.user)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  // a protected request came back 401 → the session ended
  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener('connectly:unauthorized', onUnauthorized)
    return () => window.removeEventListener('connectly:unauthorized', onUnauthorized)
  }, [])

  const login = useCallback(async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password })
    setUser(data.user)
    return data.user
  }, [])

  const demoLogin = useCallback(async () => {
    const { data } = await api.post('/auth/demo')
    setUser(data.user)
    return data.user
  }, [])

  const googleLogin = useCallback(async (accessToken) => {
    const { data } = await api.post('/auth/google', { accessToken })
    setUser(data.user)
    return data.user
  }, [])

  const verifyOtp = useCallback(async (email, otp) => {
    const { data } = await api.post('/auth/verify-otp', { email, otp })
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      /* ignore */
    }
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, setUser, loading, config, login, demoLogin, googleLogin, verifyOtp, logout }),
    [user, loading, config, login, demoLogin, googleLogin, verifyOtp, logout]
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
