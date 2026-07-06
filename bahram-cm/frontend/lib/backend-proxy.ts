/** Paths forwarded from the Next.js site to the Laravel backend (Filament admin + API). */
const BACKEND_PREFIXES = [
  "/admin",
  "/filament/",
  "/storage/",
  "/api/",
  "/css/",
  "/js/",
  "/fonts/",
];

const LIVEWIRE_PREFIX = /^\/livewire-[a-f0-9]+(?:\/|$)/;

export function shouldProxyToBackend(pathname: string): boolean {
  if (BACKEND_PREFIXES.some((prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix))) {
    return true;
  }

  return LIVEWIRE_PREFIX.test(pathname);
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
