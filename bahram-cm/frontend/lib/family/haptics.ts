/**
 * Family haptic feedback — short device vibration for key interactions.
 * Uses `navigator.vibrate` when available; no-ops on desktop / unsupported browsers.
 */

export type FamilyHapticKind = 'light' | 'medium' | 'success' | 'selection' | 'warning';

const PATTERNS: Record<FamilyHapticKind, number | number[]> = {
  /** Tap / reaction / story step */
  light: 10,
  /** Open sheet, jump FAB, send */
  medium: 16,
  /** Confirmed action (comment sent, action submitted) */
  success: [12, 40, 18],
  /** Soft UI selection (theme, picker open) */
  selection: 8,
  /** Destructive / error-ish confirm */
  warning: [20, 30, 20],
};

const MIN_INTERVAL_MS = 40;
let lastAt = 0;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/**
 * Fire a haptic pulse. Safe to call from click/tap handlers; ignores unsupported devices.
 */
export function familyHaptic(kind: FamilyHapticKind = 'light'): boolean {
  if (typeof window === 'undefined') return false;
  if (prefersReducedMotion()) return false;
  if (!canVibrate()) return false;

  const now = performance.now();
  if (now - lastAt < MIN_INTERVAL_MS) return false;
  lastAt = now;

  try {
    return navigator.vibrate(PATTERNS[kind]);
  } catch {
    return false;
  }
}
