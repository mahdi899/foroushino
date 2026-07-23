import { http } from './http'

export type CloudflareView = {
  cloudflare_zone_id: string
  cloudflare_configured: boolean
  has_cloudflare_api_token: boolean
  cloudflare_api_token_preview: string | null
  cloudflare_dev_mode: boolean | null
}

export type CloudflareStep = {
  id: string
  ok: boolean
  detail: string
}

export async function fetchCloudflareSettings(): Promise<CloudflareView> {
  return http.get<CloudflareView>('/admin/cloudflare')
}

export async function updateCloudflareSettings(input: {
  cloudflare_zone_id?: string
  cloudflare_api_token_input?: string
}): Promise<CloudflareView> {
  return http.patch<CloudflareView>('/admin/cloudflare', input)
}

export async function testCloudflareConnection(): Promise<{ ok: boolean; message: string; zone_name?: string }> {
  return http.post('/admin/cloudflare/test')
}

export async function purgeCloudflareCache(): Promise<{ ok: boolean; message: string }> {
  return http.post('/admin/cloudflare/purge')
}

export async function applyCloudflareEdge(): Promise<{
  ok: boolean
  message: string
  steps?: CloudflareStep[]
}> {
  return http.post('/admin/cloudflare/apply-edge')
}

export async function setCloudflareDevelopmentMode(enabled: boolean): Promise<{
  ok: boolean
  message: string
  cloudflare_dev_mode: boolean | null
}> {
  return http.post('/admin/cloudflare/development-mode', { enabled })
}
