import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { clearTokens, hasRefreshToken, saveTokens, tryRefresh } from '../api/client'
import * as authApi from '../api/auth'
import type { User } from '../types'

// 全局的登录状态管理：任何组件都能通过 useAuth() 拿到
// 当前用户、以及登录/注册/退出三个操作
interface AuthContextValue {
  user: User | null
  loading: boolean // 应用启动时正在尝试静默登录
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 应用启动时：本地若存有 refreshToken（7 天内登录过），
  // 就静默换一张新 accessToken 并取回用户信息——用户无感知自动登录
  useEffect(() => {
    ;(async () => {
      if (hasRefreshToken() && (await tryRefresh())) {
        try {
          const { user } = await authApi.fetchMe()
          setUser(user)
        } catch {
          clearTokens()
        }
      }
      setLoading(false)
    })()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    saveTokens(res.accessToken, res.refreshToken)
    setUser(res.user)
  }, [])

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const res = await authApi.register(email, password, name)
    saveTokens(res.accessToken, res.refreshToken)
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 <AuthProvider> 内使用')
  return ctx
}
