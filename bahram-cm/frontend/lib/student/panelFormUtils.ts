export interface SimpleFormState {
  error?: string;
  success?: string;
}

export function extractError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return 'اتصال به سرور طول کشید. لطفاً چند ثانیه بعد دوباره تلاش کنید.';
    }
    if (err.message && err.message !== 'fetch failed') {
      return err.message;
    }
  }
  const e = err as {
    status?: number;
    payload?: { error?: { message_fa?: string }; errors?: Record<string, string[]> };
  };
  if (e?.payload?.error?.message_fa) return e.payload.error.message_fa;
  const firstFieldError = e?.payload?.errors ? Object.values(e.payload.errors)[0]?.[0] : undefined;
  return firstFieldError ?? fallback;
}
