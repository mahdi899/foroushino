const SPOTPLAYER_ORIGIN = 'https://app.spotplayer.ir';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 100;

export function isSpotPlayerCookieExpired(x: string): boolean {
  if (x.length < 36) return true;

  const expiryMs = Number.parseInt(x.slice(24, 36), 16);
  if (!Number.isFinite(expiryMs)) return true;

  return Date.now() >= expiryMs;
}

export function extractSpotPlayerCookie(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;

  const match = setCookieHeader.match(/(?:^|;\s*)X=([a-f0-9]+)/i);
  return match?.[1] ?? null;
}

export async function syncSpotPlayerCookie(currentX?: string): Promise<string | null> {
  const headers: Record<string, string> = {};
  if (currentX) {
    headers.Cookie = `X=${currentX}`;
  }

  const upstream = await fetch(`${SPOTPLAYER_ORIGIN}/`, {
    method: 'HEAD',
    headers,
    redirect: 'manual',
    cache: 'no-store',
  });

  const setCookieHeaders =
    typeof upstream.headers.getSetCookie === 'function'
      ? upstream.headers.getSetCookie()
      : [upstream.headers.get('set-cookie')].filter((value): value is string => Boolean(value));

  for (const header of setCookieHeaders) {
    const nextX = extractSpotPlayerCookie(header);
    if (nextX) return nextX;
  }

  return currentX ?? null;
}

export const spotPlayerCookieOptions = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: COOKIE_MAX_AGE_SECONDS,
};
