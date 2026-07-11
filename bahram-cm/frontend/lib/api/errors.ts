type ApiErrorPayload = {
  error?: {
    message_fa?: string;
    details?: Record<string, string[]>;
  };
  errors?: Record<string, string[]>;
  message?: string;
};

/** Prefer field-specific validation text (e.g. coupon) over generic API envelopes. */
export function apiErrorMessage(payload: unknown, field?: string, fallback = 'خطایی رخ داد.'): string {
  const json = payload as ApiErrorPayload;
  const details = json?.error?.details ?? json?.errors;

  if (field && details?.[field]?.[0]) {
    return details[field][0];
  }

  if (json?.error?.message_fa) {
    return json.error.message_fa;
  }

  if (details) {
    const first = Object.values(details).flat()[0];
    if (typeof first === 'string' && first !== '') {
      return first;
    }
  }

  if (typeof json?.message === 'string' && json.message !== '') {
    return json.message;
  }

  return fallback;
}
