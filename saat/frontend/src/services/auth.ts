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
  password_login_enabled?: boolean
}

interface LoginResponse {
  token: string
  user: AuthenticatedUser
}

export function mapAuthUserRole(roles: string[]): Role {
  if (roles.includes('super-admin')) return 'super-admin'
  if (roles.includes('admin')) return 'admin'
  if (roles.includes('manager')) return 'manager'
  if (roles.includes('supervisor')) return 'supervisor'
  if (roles.includes('leader')) return 'leader'
  return 'agent'
}

async function persistLoginResponse(response: LoginResponse): Promise<AuthenticatedUser> {
  setToken(response.token)
  return response.user
}

export interface DemoAccount {
  phone: string
  otp: string
  role: string
  label: string
}

export interface PhoneOtpRequestResult {
  channel: 'demo' | 'telegram' | 'sms' | 'password' | 'choice'
  hint?: string
  password_available?: boolean
  otp_available?: boolean
}

export async function requestPhoneOtp(
  phone: string,
  method?: 'password' | 'otp',
): Promise<PhoneOtpRequestResult> {
  const payload: { phone: string; method?: 'password' | 'otp' } = { phone }
  if (method) payload.method = method
  return http.post<PhoneOtpRequestResult>('/auth/phone-otp/request', payload)
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

export async function loginWithPassword(phone: string, password: string): Promise<AuthenticatedUser> {
  const response = await http.post<LoginResponse>('/auth/password-login', { phone, password })
  return persistLoginResponse(response)
}

export async function loginWithDemoAccount(account: DemoAccount): Promise<AuthenticatedUser> {
  return verifyPhoneOtp(account.phone, account.otp)
}

/** Dev-only login for scripts and local tooling. */
export async function login(devFallback: { role?: string; email?: string } = {}): Promise<AuthenticatedUser> {
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

export interface UpdatePasswordInput {
  password: string
  passwordConfirmation: string
  currentPassword?: string
}

export async function updatePassword(input: UpdatePasswordInput): Promise<AuthenticatedUser> {
  const payload: Record<string, string> = {
    password: input.password,
    password_confirmation: input.passwordConfirmation,
  }
  if (input.currentPassword) payload.current_password = input.currentPassword
  return http.put<AuthenticatedUser>('/me/password', payload)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export { API_BASE_URL }
