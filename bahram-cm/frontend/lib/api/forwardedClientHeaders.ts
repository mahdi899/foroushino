import 'server-only';

import { headers } from 'next/headers';
import { resolveClientIpOrUnknown } from '@/lib/request/clientIp';

/**
 * Headers so Laravel `$request->ip()` sees the browser, not the Next.js server.
 * Requires TRUSTED_PROXIES to include the Next→Laravel hop (usually 127.0.0.1).
 */
export async function forwardedClientHeaders(): Promise<Record<string, string>> {
  const h = await headers();
  const ip = resolveClientIpOrUnknown((name) => h.get(name));
  const ua = h.get('user-agent')?.trim();

  const out: Record<string, string> = {};
  if (ip && ip !== 'unknown') {
    out['X-Forwarded-For'] = ip;
    out['X-Real-IP'] = ip;
  }
  if (ua) {
    out['X-Forwarded-User-Agent'] = ua;
  }
  return out;
}
