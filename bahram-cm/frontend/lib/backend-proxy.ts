/** Paths forwarded from the Next.js site to the Laravel backend (API + media). */
const BACKEND_PREFIXES = [
  "/storage/",
  "/api/",
  "/cdn/",
  "/css/",
  "/js/",
  "/fonts/",
];

export function shouldProxyToBackend(pathname: string): boolean {
  if (
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/captcha') ||
    pathname.startsWith('/api/chatbot') ||
    pathname.startsWith('/api/revalidate') ||
    pathname.startsWith('/api/cart')
  ) {
    return false;
  }

  return BACKEND_PREFIXES.some((prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix));
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
