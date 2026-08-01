const LOGIN_MAX_ATTEMPTS = 6;

type RateLimitPayload = {
  retry_after?: unknown;
  error?: {
    retry_after?: unknown;
    message_fa?: unknown;
  };
};

export function extractLoginRetryAfter(payload: unknown, headerRetryAfter?: string | null): number | null {
  if (payload && typeof payload === 'object') {
    const body = payload as RateLimitPayload;
    const fromBody = body.retry_after ?? body.error?.retry_after;
    const parsed = Number(fromBody);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.ceil(parsed);
    }
  }

  const fromHeader = Number(headerRetryAfter);
  if (Number.isFinite(fromHeader) && fromHeader > 0) {
    return Math.ceil(fromHeader);
  }

  return null;
}

export function formatLoginLockoutMessage(retryAfterSeconds: number): string {
  const seconds = Math.max(1, Math.ceil(retryAfterSeconds));

  if (seconds < 60) {
    return `حداکثر ${LOGIN_MAX_ATTEMPTS.toLocaleString('fa-IR')} تلاش برای ورود مجاز است. لطفاً ${seconds.toLocaleString('fa-IR')} ثانیه دیگر دوباره تلاش کنید.`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `حداکثر ${LOGIN_MAX_ATTEMPTS.toLocaleString('fa-IR')} تلاش برای ورود مجاز است. لطفاً ${minutes.toLocaleString('fa-IR')} دقیقه دیگر دوباره تلاش کنید.`;
}

export function loginLockoutLabel(retryAfterSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(retryAfterSeconds));
  if (seconds <= 0) return 'تلاش مجدد';
  if (seconds < 60) return `تلاش مجدد (${seconds.toLocaleString('fa-IR')} ثانیه)`;
  const minutes = Math.ceil(seconds / 60);
  return `تلاش مجدد (${minutes.toLocaleString('fa-IR')} دقیقه)`;
}
