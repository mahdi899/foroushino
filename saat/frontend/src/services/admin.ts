import { http } from './http'

export type AppSettings = Record<string, string | number | boolean | null>

export async function fetchAppSettings(): Promise<AppSettings> {
  return http.get<AppSettings>('/admin/settings')
}

export async function updateAppSettings(settings: AppSettings): Promise<AppSettings> {
  return http.patch<AppSettings>('/admin/settings', { settings })
}
