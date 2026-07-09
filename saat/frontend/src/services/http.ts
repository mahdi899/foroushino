// Thin fetch wrapper around the Laravel API envelope:
//   { success: boolean, message: string, data: T, meta?: {...}, errors?: {...}, code?: string }
import { getToken, clearToken } from './auth'

// `import.meta.env` is populated by Vite in the browser build; the Node-based
// verification script (scripts/verify-http-client.ts) runs outside Vite, so
// it falls back to `process.env` there.
const configuredBaseUrl =
  import.meta.env?.VITE_API_BASE_URL ??
  (typeof process !== 'undefined' ? process.env?.VITE_API_BASE_URL : undefined)

export const API_BASE_URL = (configuredBaseUrl ?? 'http://localhost:8000/api/v1').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class NetworkError extends Error {
  constructor(message = 'اتصال اینترنت برقرار نیست.') {
    super(message)
    this.name = 'NetworkError'
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  idempotencyKey?: string
  isFormData?: boolean
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, idempotencyKey, isFormData } = options

  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey

  let payload: BodyInit | undefined
  if (body instanceof FormData || isFormData) {
    payload = body as FormData
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: payload })
  } catch {
    throw new NetworkError()
  }

  let json: any = null
  try {
    json = await response.json()
  } catch {
    // no/invalid JSON body (e.g. 204, network-level HTML error page)
  }

  if (response.status === 401) {
    clearToken()
  }

  if (!response.ok || json?.success === false) {
    const message = json?.message ?? `درخواست ناموفق بود (${response.status})`
    throw new ApiError(message, response.status, json?.code, json?.errors)
  }

  return (json?.data ?? null) as T
}

export const http = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown, idempotencyKey?: string) =>
    request<T>(path, { method: 'POST', body, idempotencyKey }),
  postForm: <T>(path: string, body: FormData) => request<T>(path, { method: 'POST', body, isFormData: true }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export { uuid as newIdempotencyKey }
