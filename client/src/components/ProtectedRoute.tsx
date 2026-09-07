import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// 路由守卫：包住需要登录的页面。
// 未登录 → 踢回 /login；还在静默登录中 → 显示加载态，避免误踢。
export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-400">
        加载中…
      </div>
    )
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />
}
