import { ApiError } from '@/services/http'

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const fieldErrors = error.errors ? Object.values(error.errors).flat() : []
    if (fieldErrors.length > 0) return fieldErrors[0]
    if (error.message) return error.message
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
