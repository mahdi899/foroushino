import { headers } from 'next/headers';

/** Cloudflare / Arvan / common reverse-proxy country headers. */
function resolveCountryCode(getHeader: (name: string) => string | null): string | null {
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

export async function GET() {
  const h = await headers();
  const country = resolveCountryCode((name) => h.get(name));

  return Response.json(
    { country },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    },
  );
}
