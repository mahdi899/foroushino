// Single swap point for the data layer.
//
// `VITE_API_MODE=http` (with `VITE_API_BASE_URL` pointing at the Laravel
// backend) switches every write action in the app from the localStorage mock
// to the real API. Defaults to `mock` so the app keeps working out of the box.
import type { ApiClient } from './client'
import { mockClient } from './mockClient'
import { httpClient } from './httpClient'

export const apiMode: 'mock' | 'http' = import.meta.env?.VITE_API_MODE === 'http' ? 'http' : 'mock'

export const api: ApiClient = apiMode === 'http' ? httpClient : mockClient

export type { ApiClient } from './client'
export * from './logic'
