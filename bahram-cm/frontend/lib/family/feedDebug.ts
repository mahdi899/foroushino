/**
 * Family app debug toolkit — enable in console:
 *   familyDebug.on()
 *   familyDebug.rewind(124)
 *   copy(JSON.stringify(familyDebug.report(), null, 2))
 *
 * Scopes: boot | land | fab | scroll | stick | catchup | render | reaction | comment | perf | realtime
 */

export type FamilyDebugLevel = 'info' | 'warn' | 'error';

export type FamilyDebugScope =
  | 'boot'
  | 'land'
  | 'fab'
  | 'scroll'
  | 'stick'
  | 'catchup'
  | 'render'
  | 'reaction'
  | 'comment'
  | 'perf'
  | 'realtime'
  | 'ui'
  | string;

export type FamilyDebugEvent = {
  t: number;
  dt: number;
  level: FamilyDebugLevel;
  scope: FamilyDebugScope;
  message: string;
  data?: Record<string, unknown>;
};

const STORAGE_KEY = 'family-feed-debug';
const GLOBAL_CURSOR_KEY = 'family-feed-last-read-id';
const RING_MAX = 400;

let ring: FamilyDebugEvent[] = [];
let enabledCache: boolean | null = null;
let sessionStartedAt = 0;
let seq = 0;

const renderCounts = new Map<string, number>();
const marks = new Map<string, number>();
const throttleAt = new Map<string, number>();

let longTaskObserver: PerformanceObserver | null = null;
let installed = false;

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function readEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const q = new URLSearchParams(window.location.search).get('familyDebug');
    if (q === '1') return true;
    if (q === '0') return false;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === '1') return true;
    if (stored === '0') return false;
    return process.env.NODE_ENV === 'development';
  } catch {
    return process.env.NODE_ENV === 'development';
  }
}

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
  if (on) {
    sessionStartedAt = Date.now();
    startPerfObservers();
  } else {
    stopPerfObservers();
  }
  // eslint-disable-next-line no-console
  console.info(`[family] debug ${on ? 'ON' : 'OFF'}`);
}

/** Rewind catch-up cursor so next Family enter shows unread landing. */
export function rewindFamilyFeedCursor(afterId: number): void {
  if (typeof window === 'undefined' || afterId < 0) return;
  try {
    window.localStorage.setItem(GLOBAL_CURSOR_KEY, String(afterId));
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith('family-feed-last-read-id:')) keys.push(key);
    }
    for (const key of keys) window.localStorage.setItem(key, String(afterId));
    window.sessionStorage.removeItem('family-enter-unread-after');
  } catch {
    /* ignore */
  }
  familyFeedDebug.info('boot', 'cursor rewind', { afterId });
  // eslint-disable-next-line no-console
  console.info(`[family] cursor → ${afterId}. Leave /family then re-enter from سایت.`);
}

function push(event: FamilyDebugEvent): void {
  ring.push(event);
  if (ring.length > RING_MAX) ring = ring.slice(-RING_MAX);
}

function emit(
  level: FamilyDebugLevel,
  scope: FamilyDebugScope,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (!isFamilyFeedDebugEnabled()) return;
  if (!sessionStartedAt) sessionStartedAt = Date.now();
  seq += 1;
  const event: FamilyDebugEvent = {
    t: Date.now(),
    dt: Math.round(now() * 10) / 10,
    level,
    scope,
    message,
    data: data ? { ...data, _seq: seq } : { _seq: seq },
  };
  push(event);

  const label = `[family:${scope}] ${message}`;
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

function startPerfObservers(): void {
  if (typeof window === 'undefined' || longTaskObserver) return;
  try {
    if ('PerformanceObserver' in window) {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration < 50) continue;
          emit('warn', 'perf', 'long task', {
            ms: Math.round(entry.duration),
            name: entry.name,
            start: Math.round(entry.startTime),
          });
        }
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true } as PerformanceObserverInit);
    }
  } catch {
    longTaskObserver = null;
  }
}

function stopPerfObservers(): void {
  longTaskObserver?.disconnect();
  longTaskObserver = null;
}

function buildReport() {
  const byScope: Record<string, number> = {};
  const warnings = ring.filter((e) => e.level === 'warn' || e.level === 'error');
  for (const e of ring) {
    byScope[e.scope] = (byScope[e.scope] ?? 0) + 1;
  }
  const renders = [...renderCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    sessionMs: sessionStartedAt ? Date.now() - sessionStartedAt : 0,
    events: ring.length,
    byScope,
    warnings: warnings.slice(-40),
    topRenders: renders.slice(0, 20),
    recent: ring.slice(-80),
    tips: [
      'familyDebug.rewind(N) then leave /family and re-enter from سایت',
      'familyDebug.clear() to reset the ring',
      'copy(JSON.stringify(familyDebug.report(), null, 2)) to share',
    ],
  };
}

export const familyFeedDebug = {
  info: (scope: FamilyDebugScope, message: string, data?: Record<string, unknown>) =>
    emit('info', scope, message, data),
  warn: (scope: FamilyDebugScope, message: string, data?: Record<string, unknown>) =>
    emit('warn', scope, message, data),
  error: (scope: FamilyDebugScope, message: string, data?: Record<string, unknown>) =>
    emit('error', scope, message, data),

  /** High-frequency safe log (default 250ms). */
  throttle: (
    key: string,
    scope: FamilyDebugScope,
    message: string,
    data?: Record<string, unknown>,
    ms = 250,
  ) => {
    if (!isFamilyFeedDebugEnabled()) return;
    const last = throttleAt.get(key) ?? 0;
    const t = now();
    if (t - last < ms) return;
    throttleAt.set(key, t);
    emit('info', scope, message, data);
  },

  mark: (name: string) => {
    marks.set(name, now());
  },

  measure: (name: string, scope: FamilyDebugScope = 'perf', extra?: Record<string, unknown>) => {
    const start = marks.get(name);
    if (start == null) return;
    const ms = Math.round((now() - start) * 10) / 10;
    marks.delete(name);
    emit(ms > 120 ? 'warn' : 'info', scope, `⏱ ${name}`, { ms, ...extra });
    return ms;
  },

  trackRender: (name: string) => {
    if (!isFamilyFeedDebugEnabled()) return 0;
    const next = (renderCounts.get(name) ?? 0) + 1;
    renderCounts.set(name, next);
    // Aggregate noise: log first, then every 25th (PostCard spam was drowning real events).
    if (next === 1 || next % 25 === 0) {
      emit('info', 'render', name, { count: next });
    }
    return next;
  },

  dump: (): FamilyDebugEvent[] => ring.slice(),
  report: () => buildReport(),
  clear: () => {
    ring = [];
    renderCounts.clear();
    marks.clear();
    throttleAt.clear();
    seq = 0;
  },
};

/** @deprecated use familyFeedDebug — kept for existing FeedView imports */
export const familyDebug = familyFeedDebug;

declare global {
  interface Window {
    familyFeedDebugEnable?: (on?: boolean) => void;
    familyFeedDebugDump?: () => FamilyDebugEvent[];
    familyFeedRewind?: (afterId: number) => void;
    familyDebug?: {
      on: (v?: boolean) => void;
      off: () => void;
      dump: () => FamilyDebugEvent[];
      report: () => ReturnType<typeof buildReport>;
      clear: () => void;
      rewind: (afterId: number) => void;
      renders: () => { name: string; count: number }[];
    };
  }
}

export function installFamilyFeedDebugGlobals(): void {
  if (typeof window === 'undefined' || installed) return;
  installed = true;

  window.familyFeedDebugEnable = enableFamilyFeedDebug;
  window.familyFeedDebugDump = () => familyFeedDebug.dump();
  window.familyFeedRewind = rewindFamilyFeedCursor;
  window.familyDebug = {
    on: (v = true) => enableFamilyFeedDebug(v),
    off: () => enableFamilyFeedDebug(false),
    dump: () => familyFeedDebug.dump(),
    report: () => familyFeedDebug.report(),
    clear: () => familyFeedDebug.clear(),
    rewind: rewindFamilyFeedCursor,
    renders: () =>
      [...renderCounts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
  };

  if (isFamilyFeedDebugEnabled()) {
    sessionStartedAt = Date.now();
    startPerfObservers();
    // eslint-disable-next-line no-console
    console.info(
      '%c[family] debug ON',
      'color:#3390ec;font-weight:700',
      '\n  familyDebug.report()  → summary JSON\n  familyDebug.rewind(N) → unread test\n  familyDebug.renders() → re-render counts\n  copy(JSON.stringify(familyDebug.report(),null,2))',
    );
  }
}
