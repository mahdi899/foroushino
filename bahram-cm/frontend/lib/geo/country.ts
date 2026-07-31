import 'server-only';
import { headers } from 'next/headers';

/** Cloudflare / Arvan / common reverse-proxy country headers. */
export function resolveCountryCode(getHeader: (name: string) => string | null): string | null {
  const raw =
    getHeader('cf-ipcountry')
    ?? getHeader('x-country-code')
    ?? getHeader('x-geo-country')
    ?? getHeader('cloudfront-viewer-country');

  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (code.length !== 2 || code === 'XX' || code === 'T1') return null;

  return code;
}

export async function getRequestCountryCode(): Promise<string | null> {
  const h = await headers();
  return resolveCountryCode((name) => h.get(name));
}

export async function isRequestFromIran(): Promise<boolean> {
  return (await getRequestCountryCode()) === 'IR';
}
