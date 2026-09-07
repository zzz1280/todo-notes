// 统一的 API 客户端：自动附带登录 token；遇 401 自动用 refreshToken 换发并重试一次。
// 所有页面都通过这里的 api() 函数发请求，不直接用 fetch。

const API_BASE = '/api'

// accessToken 只放在内存里：页面刷新后靠 refreshToken 重新换取。
// 为什么不全放 localStorage？token 被偷的损失 = 剩余有效期，内存里这份最短命。
let accessToken: string | null = null

const REFRESH_KEY = 'refreshToken'

export function saveTokens(access: string, refresh: string) {
  accessToken = access
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  accessToken = null
  localStorage.removeItem(REFRESH_KEY)
}

export function hasRefreshToken() {
  return localStorage.getItem(REFRESH_KEY) !== null
}

// 请求失败时抛出的统一错误：带状态码、后端的友好信息、字段级错误
export class ApiError extends Error {
  status: number
  details?: { field: string; message: string }[]

  constructor(
    status: number,
    message: string,
    details?: { field: string; message: string }[],
  ) {
    super(message)
    this.status = status
    this.details = details
  }
}

// 用 refreshToken 换新的 accessToken。
// 失败说明登录态彻底失效（7 天到了），清空本地凭证，调用方会跳回登录页。
export async function tryRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  if (!refreshToken) return false

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) {
    clearTokens()
    return false
  }

  const data: { accessToken: string } = await res.json()
  accessToken = data.accessToken
  return true
}

interface ApiOptions {
  method?: string
  body?: unknown
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const send = () =>
    fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })

  let res = await send()

  // 业务请求返回 401 → 大概率是 accessToken 过期（15 分钟），换发后原请求重试一次。
  // /auth/ 开头的请求本身不带 token，不参与此逻辑，避免换发失败引发循环。
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const refreshed = await tryRefresh()
    if (refreshed) res = await send()
  }

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as {
      error?: string
      details?: { field: string; message: string }[]
    } | null
    throw new ApiError(
      res.status,
      payload?.error ?? `请求失败（HTTP ${res.status}）`,
      payload?.details,
    )
  }

  if (res.status === 204) return null as T
  return (await res.json()) as T
}
