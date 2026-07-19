import { http } from './http'

export type AppSettings = Record<string, string | number | boolean | null>

export async function fetchAppSettings(): Promise<AppSettings> {
  return http.get<AppSettings>('/admin/settings')
}

export async function updateAppSettings(settings: AppSettings): Promise<AppSettings> {
  return http.patch<AppSettings>('/admin/settings', { settings })
}

export async function testVoipConnection(): Promise<{ ok: boolean; message: string }> {
  const data = await http.post<{ ok: boolean; message: string }>('/telephony/test-connection')
  return { ok: data.ok, message: data.message }
}

export async function testMelipayamakConnection(input: {
  username?: string
  password?: string
  rest_url?: string
}): Promise<{ ok: boolean; message: string; credit?: number }> {
  const payload: Record<string, string> = {}
  if (input.username?.trim()) payload.username = input.username.trim()
  if (input.password?.trim()) payload.password = input.password.trim()
  if (input.rest_url?.trim()) payload.rest_url = input.rest_url.trim()
  return http.post<{ ok: boolean; message: string; credit?: number }>(
    '/admin/settings/test-melipayamak',
    payload,
  )
}
