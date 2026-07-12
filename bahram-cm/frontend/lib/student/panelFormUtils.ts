export interface SimpleFormState {
  error?: string;
  success?: string;
}

export function extractError(err: unknown, fallback: string): string {
  const e = err as {
    status?: number;
    payload?: { error?: { message_fa?: string }; errors?: Record<string, string[]> };
  };
  if (e?.payload?.error?.message_fa) return e.payload.error.message_fa;
  const firstFieldError = e?.payload?.errors ? Object.values(e.payload.errors)[0]?.[0] : undefined;
  return firstFieldError ?? fallback;
}
