/**
 * Shared client for the Academy backend (FastAPI).
 *
 * All public-facing form submissions go through here so the base URL, error
 * shape, and timeout behaviour are consistent. The backend returns typed domain
 * errors as `{ error: { code, message_fa, details } }`.
 */

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
  "http://localhost:8000"
);

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string; status?: number };

type BackendError = {
  error?: { code?: string; message_fa?: string; details?: unknown };
};

const DEFAULT_TIMEOUT_MS = 15000;

export async function getJson<T>(
  path: string,
  { timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${API_BASE_URL}/api/v1${path.startsWith("/") ? path : `/${path}`}`;

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
  { timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${API_BASE_URL}/api/v1${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      let message = "ارسال انجام نشد. لطفاً دوباره تلاش کن.";
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
