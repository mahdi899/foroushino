import { isLoopbackIp } from './clientIp';

const CACHE_KEY = 'bahram_visitor_ip';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let inflight: Promise<string | undefined> | undefined;

function readCachedIp(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { ip?: string; at?: number };
    if (!parsed.ip || !parsed.at || Date.now() - parsed.at > CACHE_TTL_MS) return undefined;
    if (isLoopbackIp(parsed.ip)) return undefined;
    return parsed.ip;
  } catch {
    return undefined;
  }
}

function writeCachedIp(ip: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ip, at: Date.now() }));
  } catch {
    /* quota */
  }
}

async function fetchPublicIpFromBrowser(): Promise<string | undefined> {
  try {
    const res = await fetch('https://api64.ipify.org?format=json', {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { ip?: string };
    const ip = data.ip?.trim();
    if (ip && !isLoopbackIp(ip)) return ip;
  } catch {
    /* non-fatal */
  }
  return undefined;
}

export async function resolveVisitorIpClient(): Promise<string | undefined> {
  const cached = readCachedIp();
  if (cached) return cached;

  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await fetch('/api/geo/ip', { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as { ip?: string | null };
          if (data.ip && !isLoopbackIp(data.ip)) {
            writeCachedIp(data.ip);
            return data.ip;
          }
        }
      } catch {
        /* try public lookup */
      }

      const publicIp = await fetchPublicIpFromBrowser();
      if (publicIp) writeCachedIp(publicIp);
      return publicIp;
    })().finally(() => {
      inflight = undefined;
    });
  }

  return inflight;
}
