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

export type IntegrationTokenRow = {
  id: number
  name: string
  abilities: string[]
  created_by_name: string | null
  last_used_at: string | null
  revoked_at: string | null
  created_at: string | null
}

export async function fetchIntegrationTokens(): Promise<{
  tokens: IntegrationTokenRow[]
  inbound_applications_url: string
  inbound_ping_url: string
}> {
  return http.get('/admin/integration-tokens')
}

export async function createIntegrationToken(name: string): Promise<{
  token: { id: number; name: string; plain_text: string }
  inbound_applications_url: string
  inbound_ping_url: string
}> {
  return http.post('/admin/integration-tokens', { name })
}

export async function revokeIntegrationToken(id: number): Promise<void> {
  await http.del(`/admin/integration-tokens/${id}`)
}
