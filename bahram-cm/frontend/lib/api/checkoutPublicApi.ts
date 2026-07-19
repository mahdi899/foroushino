/**
 * Browser checkout calls go through Next.js middleware (`/api/*` → Laravel).
 * Direct `127.0.0.1:8010` from the client breaks on LAN hosts / CORS.
 */
export function checkoutPublicApiBase(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }

  const backend = (
    process.env.BACKEND_PROXY_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    'http://127.0.0.1:8010'
  ).replace(/\/+$/, '');

  return `${backend}/api`;
}
