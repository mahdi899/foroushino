/** Paths forwarded from the Next.js site to the Laravel backend (API + media). */
const BACKEND_PREFIXES = [
  "/storage/",
  "/api/",
  "/cdn/",
  "/css/",
  "/js/",
  "/fonts/",
];

/**
 * Next.js App Router handlers under `/api/*` — middleware must not proxy these.
 * Captcha/chatbot are proxied to Laravel `/api/v1/*` instead (see `toBackendPath`).
 */
const NEXT_API_HANDLERS = [
  "/api/admin",
  "/api/revalidate",
  "/api/cart",
  "/api/student",
  "/api/broadcasting",
  "/api/sat",
  "/api/spotx",
];

/** Browser calls `/api/captcha|chatbot/*`; Laravel serves `/api/v1/captcha|chatbot/*`. */
export function toBackendPath(pathname: string): string {
  if (pathname.startsWith("/api/captcha") || pathname.startsWith("/api/chatbot")) {
    return pathname.replace(/^\/api\//, "/api/v1/");
  }
  return pathname;
}

export function shouldProxyToBackend(pathname: string): boolean {
  if (NEXT_API_HANDLERS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return false;
  }

  return BACKEND_PREFIXES.some((prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix));
}

/** True when middleware should not touch the request (leave Next route handlers alone). */
export function isNextApiHandlerPath(pathname: string): boolean {
  return NEXT_API_HANDLERS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function backendProxyUrl(): string {
  return (process.env.BACKEND_PROXY_URL ?? "http://127.0.0.1:8010").replace(/\/+$/, "");
}

/** Rewrite backend-origin redirects to the public site origin. */
export function rewriteProxyLocation(location: string, publicOrigin: string, backendOrigin: string): string {
  if (location.startsWith(backendOrigin)) {
    return publicOrigin + location.slice(backendOrigin.length);
  }

  if (location.startsWith("/")) {
    return publicOrigin + location;
  }

  return location;
}
