import { getTelegramInitData, isInTelegram } from '@/lib/telegram'
import { http, API_BASE_URL } from './http'
import type { Role } from '@/types'

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

export interface TelegramWidgetUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

interface LoginResponse {
  token: string
  user: AuthenticatedUser
}

export function mapAuthUserRole(roles: string[]): Role {
  if (roles.includes('manager') || roles.includes('admin')) return 'manager'
  if (roles.includes('supervisor')) return 'supervisor'
  if (roles.includes('leader')) return 'leader'
  return 'agent'
}

async function persistLoginResponse(response: LoginResponse): Promise<AuthenticatedUser> {
  setToken(response.token)
  return response.user
}

/**
 * Mini App login — requires signed Telegram WebApp initData.
 */
export async function loginWithTelegramWebApp(): Promise<AuthenticatedUser> {
  const initData = getTelegramInitData()
  if (!initData) {
    throw new Error('داده ورود تلگرام در دسترس نیست. اپ را از داخل تلگرام باز کنید.')
  }

  const response = await http.post<LoginResponse>('/auth/telegram', { init_data: initData })
  return persistLoginResponse(response)
}

/**
 * Browser login via the official Telegram Login Widget callback payload.
 */
export async function loginWithTelegramWidget(user: TelegramWidgetUser): Promise<AuthenticatedUser> {
  const response = await http.post<LoginResponse>('/auth/telegram-widget', user)
  return persistLoginResponse(response)
}

export interface DemoAccount {
  phone: string
  otp: string
  role: string
  label: string
}

export interface PhoneOtpRequestResult {
  channel: 'demo' | 'telegram'
  hint?: string
}

export async function requestPhoneOtp(phone: string): Promise<PhoneOtpRequestResult> {
  return http.post<PhoneOtpRequestResult>('/auth/phone-otp/request', { phone })
}

export async function fetchDemoAccounts(): Promise<DemoAccount[]> {
  try {
    return await http.get<DemoAccount[]>('/auth/demo-accounts')
  } catch {
    return []
  }
}

export async function verifyPhoneOtp(phone: string, code: string): Promise<AuthenticatedUser> {
  const response = await http.post<LoginResponse>('/auth/phone-otp/verify', { phone, code })
  return persistLoginResponse(response)
}

export async function loginWithDemoAccount(account: DemoAccount): Promise<AuthenticatedUser> {
  return verifyPhoneOtp(account.phone, account.otp)
}

export async function requestTelegramOtp(initData: string): Promise<void> {
  await http.post<null>('/auth/telegram-otp/request', { init_data: initData })
}

export async function verifyTelegramOtp(initData: string, code: string): Promise<AuthenticatedUser> {
  const response = await http.post<LoginResponse>('/auth/telegram-otp/verify', {
    init_data: initData,
    code,
  })
  return persistLoginResponse(response)
}

/**
 * Dev-only fallback when not running inside Telegram.
 */
export async function login(devFallback: { role?: string; email?: string } = {}): Promise<AuthenticatedUser> {
  if (isInTelegram()) {
    return loginWithTelegramWebApp()
  }

  const response = await http.post<LoginResponse>('/auth/dev-login', devFallback)
  return persistLoginResponse(response)
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

export async function uploadAvatar(file: File): Promise<AuthenticatedUser> {
  const form = new FormData()
  form.append('avatar', file)
  return http.postForm<AuthenticatedUser>('/me/avatar', form)
}

export async function removeAvatar(): Promise<AuthenticatedUser> {
  return http.del<AuthenticatedUser>('/me/avatar')
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? ''

export { API_BASE_URL }
