/**
 * Shared client for the Laravel backend (bahram-cm).
 *
 * All public-facing form submissions and content reads go through here so the
 * base URL, error shape, and timeout behaviour are consistent. The backend
 * returns a standardized envelope: `{ data: ... }` on success and
 * `{ error: { code, message_fa, details } }` on failure.
 */

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
  "http://localhost:3000"
);

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string; status?: number };

type BackendError = {
  error?: { code?: string; message_fa?: string; details?: unknown };
};

export function extractValidationMessage(payload: unknown, field: string): string | null {
  if (!payload || typeof payload !== 'object') return null;

  const legacy = (payload as { errors?: Record<string, string[]> }).errors;
  if (legacy?.[field]?.[0]) return legacy[field][0]!;

  const details = (payload as BackendError).error?.details;
  if (details && typeof details === 'object' && field in details) {
    const msgs = (details as Record<string, string[]>)[field];
    if (Array.isArray(msgs) && typeof msgs[0] === 'string') return msgs[0];
  }

  return null;
}

const DEFAULT_TIMEOUT_MS = 15000;

export async function getJson<T>(
  path: string,
  { timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${API_BASE_URL}/api${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });

    if (!res.ok) {
      let message = "درخواست انجام نشد. لطفاً دوباره تلاش کن.";
      let code: string | undefined;
      try {
        const payload = (await res.json()) as BackendError;
        if (payload?.error?.message_fa) message = payload.error.message_fa;
        code = payload?.error?.code;
      } catch {
        // non-JSON error body — keep default message
      }
      return { ok: false, error: message, code, status: res.status };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return {
      ok: false,
      error: aborted
        ? "اتصال کند است؛ لطفاً دوباره تلاش کن."
        : "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کن.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function postJson<T>(
  path: string,
  body: unknown,
  {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    headers: extraHeaders,
  }: { timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${API_BASE_URL}/api${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...extraHeaders },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      let message = "ارسال انجام نشد. لطفاً دوباره تلاش کن.";
      let code: string | undefined;
      try {
        const payload = (await res.json()) as BackendError & {
          errors?: Record<string, string[]>;
          message?: string;
        };
        const captchaMsg = extractValidationMessage(payload, 'captcha');
        if (captchaMsg) message = captchaMsg;
        else if (payload?.error?.message_fa) message = payload.error.message_fa;
        else if (payload?.errors?.captcha?.[0]) message = payload.errors.captcha[0];
        else if (payload?.message) message = payload.message;
        code = payload?.error?.code;
      } catch {
        // non-JSON error body — keep default message
      }
      return { ok: false, error: message, code, status: res.status };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return {
      ok: false,
      error: aborted
        ? "اتصال کند است؛ لطفاً دوباره تلاش کن."
        : "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کن.",
    };
  } finally {
    clearTimeout(timer);
  }
}
