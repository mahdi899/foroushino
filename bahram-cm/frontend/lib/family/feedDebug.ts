type FamilyFeedDebugLevel = 'info' | 'warn' | 'error';

type FamilyFeedDebugEvent = {
  t: number;
  level: FamilyFeedDebugLevel;
  scope: string;
  message: string;
  data?: Record<string, unknown>;
};

const STORAGE_KEY = 'family-feed-debug';
const GLOBAL_CURSOR_KEY = 'family-feed-last-read-id';
const RING_MAX = 120;

let ring: FamilyFeedDebugEvent[] = [];
let enabledCache: boolean | null = null;

function readEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('familyDebug') === '1') return true;
    if (new URLSearchParams(window.location.search).get('familyDebug') === '0') return false;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === '1') return true;
    if (stored === '0') return false;
    // Default ON in local/dev so test sessions always produce a dumpable trail.
    return process.env.NODE_ENV === 'development';
  } catch {
    return process.env.NODE_ENV === 'development';
  }
}

/** Enable: localStorage.setItem('family-feed-debug','1') or ?familyDebug=1 */
export function isFamilyFeedDebugEnabled(): boolean {
  if (enabledCache == null) enabledCache = readEnabled();
  return enabledCache;
}

export function enableFamilyFeedDebug(on = true): void {
  if (typeof window === 'undefined') return;
  try {
    if (on) window.localStorage.setItem(STORAGE_KEY, '1');
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  enabledCache = on;
  // eslint-disable-next-line no-console
  console.info(`[family-feed] debug ${on ? 'ON' : 'OFF'}`);
}

/** Rewind catch-up cursor so the next Family enter lands with unread. */
export function rewindFamilyFeedCursor(afterId: number): void {
  if (typeof window === 'undefined' || afterId < 0) return;
  try {
    window.localStorage.setItem(GLOBAL_CURSOR_KEY, String(afterId));
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith('family-feed-last-read-id:')) keys.push(key);
    }
    for (const key of keys) {
      window.localStorage.setItem(key, String(afterId));
    }
    window.sessionStorage.removeItem('family-enter-unread-after');
  } catch {
    /* ignore */
  }
  // eslint-disable-next-line no-console
  console.info(`[family-feed] cursor rewind → afterId=${afterId}. Leave /family then re-enter from سایت.`);
}

function push(event: FamilyFeedDebugEvent): void {
  ring.push(event);
  if (ring.length > RING_MAX) ring = ring.slice(-RING_MAX);
}

function emit(
  level: FamilyFeedDebugLevel,
  scope: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (!isFamilyFeedDebugEnabled()) return;
  const event: FamilyFeedDebugEvent = {
    t: Date.now(),
    level,
    scope,
    message,
    data,
  };
  push(event);

  const label = `[family-feed:${scope}] ${message}`;
  const payload = data ?? '';
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(label, payload);
  } else if (level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(label, payload);
  } else {
    // eslint-disable-next-line no-console
    console.log(label, payload);
  }
}

export const familyFeedDebug = {
  info: (scope: string, message: string, data?: Record<string, unknown>) =>
    emit('info', scope, message, data),
  warn: (scope: string, message: string, data?: Record<string, unknown>) =>
    emit('warn', scope, message, data),
  error: (scope: string, message: string, data?: Record<string, unknown>) =>
    emit('error', scope, message, data),
  /** Dump recent events as JSON — call from console: copy(familyFeedDebugDump()) */
  dump: (): FamilyFeedDebugEvent[] => ring.slice(),
  clear: () => {
    ring = [];
  },
};

declare global {
  interface Window {
    familyFeedDebugEnable?: (on?: boolean) => void;
    familyFeedDebugDump?: () => FamilyFeedDebugEvent[];
    familyFeedRewind?: (afterId: number) => void;
  }
}

/** Expose helpers on window once (client only). */
export function installFamilyFeedDebugGlobals(): void {
  if (typeof window === 'undefined') return;
  window.familyFeedDebugEnable = enableFamilyFeedDebug;
  window.familyFeedDebugDump = () => familyFeedDebug.dump();
  window.familyFeedRewind = rewindFamilyFeedCursor;
  if (isFamilyFeedDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.info(
      '[family-feed] debug ON — dump: copy(JSON.stringify(familyFeedDebugDump(),null,2)) | rewind: familyFeedRewind(104)',
    );
  }
}
