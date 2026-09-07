import { api } from './client'
import type { AuthResponse, User } from '../types'

export function login(email: string, password: string) {
  return api<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export function register(email: string, password: string, name?: string) {
  return api<AuthResponse>('/auth/register', {
    method: 'POST',
    body: { email, password, name },
  })
}

export function fetchMe() {
  return api<{ user: User }>('/auth/me')
}
