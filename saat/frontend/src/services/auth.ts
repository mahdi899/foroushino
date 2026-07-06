// Sanctum token storage + the two login flows the backend exposes:
//   - POST /auth/telegram   (real Telegram Mini App initData verification)
//   - POST /auth/dev-login  (fallback used in the browser / during development)
import { getTelegramInitData, isInTelegram } from '@/lib/telegram'
import { http, API_BASE_URL } from './http'

const TOKEN_KEY = 'saat_api_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export interface AuthenticatedUser {
  id: number
  name: string
  phone: string | null
  email: string
  avatar: string | null
  team_id: number | null
  team_name: string | null
  level: number
  points: number
  streak: number
  call_goal: number
  sale_goal: number
  availability: string
  is_active: boolean
  roles: string[]
  permissions: string[]
}

interface LoginResponse {
  token: string
  user: AuthenticatedUser
}

/**
 * Logs in with the real Telegram `initData` when running inside the Telegram
 * WebApp, otherwise falls back to the backend's `dev-login` endpoint (by role
 * or email) so the Mini App is also usable as a plain mobile web app in dev.
 */
export async function login(devFallback: { role?: string; email?: string } = {}): Promise<AuthenticatedUser> {
  const initData = isInTelegram() ? getTelegramInitData() : null

  const { token, user } = initData
    ? await http.post<LoginResponse>('/auth/telegram', { init_data: initData })
    : await http.post<LoginResponse>('/auth/dev-login', devFallback)

  setToken(token)
  return user
}

export async function logout(): Promise<void> {
  try {
    await http.post('/auth/logout')
  } finally {
    clearToken()
  }
}

export async function fetchMe(): Promise<AuthenticatedUser> {
  return http.get<AuthenticatedUser>('/me')
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export { API_BASE_URL }
