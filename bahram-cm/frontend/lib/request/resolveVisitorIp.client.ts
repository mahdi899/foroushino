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
        /* non-fatal */
      }

      return undefined;
    })().finally(() => {
      inflight = undefined;
    });
  }

  return inflight;
}
