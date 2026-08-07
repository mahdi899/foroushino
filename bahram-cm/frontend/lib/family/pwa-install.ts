'use client';

/**
 * Family PWA install state — captures `beforeinstallprompt` at module load
 * so the event is not lost before React mounts.
 *
 * Once the app is installed (or opened as an installed PWA), we persist that
 * so browser tabs never keep nagging with install promos.
 */

import { useSyncExternalStore } from 'react';
import { ensureFamilyServiceWorkerRegistered } from '@/lib/family/pwa-service-worker';

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type FamilyPwaInstallHintKind = 'ios' | 'android-manual' | 'in-app' | null;

type Listener = () => void;

const TOP_BANNER_DISMISS_KEY = 'family-pwa-install-dismissed';
const MID_FEED_DISMISS_KEY = 'family-pwa-mid-install-dismissed';
/** Durable flag: this browser profile already installed / launched the Family PWA. */
const INSTALLED_KEY = 'family-pwa-installed';
const TOP_BANNER_COOLDOWN_MS = 4 * 24 * 60 * 60_000;

const INSTALLED_DISPLAY_MODES = [
  'standalone',
  'fullscreen',
  'minimal-ui',
  'window-controls-overlay',
] as const;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
let bootstrapped = false;
const listeners = new Set<Listener>();

type FamilyEarlyWindow = Window & {
  __familyDeferredInstall?: BeforeInstallPromptEvent | null;
};

function absorbEarlyDeferredPrompt(onBeforeInstall: (event: Event) => void): void {
  const early = (window as FamilyEarlyWindow).__familyDeferredInstall;
  if (early) {
    (window as FamilyEarlyWindow).__familyDeferredInstall = null;
    onBeforeInstall(early);
  }
}

function waitForInstallPrompt(timeoutMs: number): Promise<void> {
  if (deferredPrompt) return Promise.resolve();

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      listeners.delete(onMaybeReady);
      resolve();
    }, timeoutMs);

    const onMaybeReady = () => {
      if (!deferredPrompt) return;
      window.clearTimeout(timer);
      listeners.delete(onMaybeReady);
      resolve();
    };

    listeners.add(onMaybeReady);
  });
}

function notify() {
  listeners.forEach((listener) => listener());
}

function readPersistedInstalled(): boolean {
  try {
    return window.localStorage.getItem(INSTALLED_KEY) === '1';
  } catch {
    return false;
  }
}

function persistInstalled(): void {
  try {
    window.localStorage.setItem(INSTALLED_KEY, '1');
  } catch {
    /* ignore quota / private mode */
  }
}

function markInstalled(): void {
  const changed = !installed || deferredPrompt !== null;
  installed = true;
  deferredPrompt = null;
  persistInstalled();
  if (changed) notify();
}

function readStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (
    INSTALLED_DISPLAY_MODES.some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches)
  ) {
    return true;
  }
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return /FBAN|FBAV|Instagram|Line\/|Twitter|Telegram|MicroMessenger|Snapchat|LinkedInApp|Pinterest|TikTok/i.test(
    ua,
  );
}

function readDismissedAt(key: string): number | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    if (raw === '1') {
      const at = Date.now();
      window.localStorage.setItem(key, String(at));
      return at;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isDismissed(key: string, cooldownMs: number): boolean {
  const at = readDismissedAt(key);
  return at !== null && Date.now() - at < cooldownMs;
}

/** Chrome: detect same-origin PWA via manifest `related_applications`. */
async function detectInstalledRelatedApps(): Promise<void> {
  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<Array<{ platform?: string }>>;
  };
  if (typeof nav.getInstalledRelatedApps !== 'function') return;
  try {
    const apps = await nav.getInstalledRelatedApps();
    if (apps.length > 0) markInstalled();
  } catch {
    /* unsupported / permission */
  }
}

export function bootstrapFamilyPwaInstall(): void {
  if (typeof window === 'undefined' || bootstrapped) return;
  bootstrapped = true;

  const standalone = readStandalone();
  installed = standalone || readPersistedInstalled();
  if (standalone) persistInstalled();

  const onBeforeInstall = (event: Event) => {
    event.preventDefault();
    // Already installed on this profile — never surface install UI again.
    if (installed || readPersistedInstalled()) {
      markInstalled();
      return;
    }
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  };

  const onInstalled = () => {
    markInstalled();
  };

  const onDisplayMode = () => {
    if (readStandalone()) markInstalled();
  };

  window.addEventListener('beforeinstallprompt', onBeforeInstall);
  window.addEventListener('appinstalled', onInstalled);
  absorbEarlyDeferredPrompt(onBeforeInstall);
  for (const mode of INSTALLED_DISPLAY_MODES) {
    try {
      window.matchMedia(`(display-mode: ${mode})`).addEventListener('change', onDisplayMode);
    } catch {
      /* older browsers */
    }
  }

  void detectInstalledRelatedApps();
  void ensureFamilyServiceWorkerRegistered().then(() => {
    absorbEarlyDeferredPrompt(onBeforeInstall);
    if (deferredPrompt) notify();
  });
}

export function subscribeFamilyPwaInstall(listener: Listener): () => void {
  bootstrapFamilyPwaInstall();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export type FamilyPwaInstallSnapshot = {
  isInstalled: boolean;
  canPrompt: boolean;
  isIos: boolean;
  isInAppBrowser: boolean;
  hintKind: FamilyPwaInstallHintKind;
  showTopBanner: boolean;
  showMidFeedPromos: boolean;
};

const SSR_SNAPSHOT: FamilyPwaInstallSnapshot = {
  isInstalled: false,
  canPrompt: false,
  isIos: false,
  isInAppBrowser: false,
  hintKind: null,
  showTopBanner: false,
  showMidFeedPromos: false,
};

/** Cached client snapshot — Object.is identity must be stable for useSyncExternalStore. */
let cachedSnapshot: FamilyPwaInstallSnapshot = SSR_SNAPSHOT;

function snapshotsEqual(a: FamilyPwaInstallSnapshot, b: FamilyPwaInstallSnapshot): boolean {
  return (
    a.isInstalled === b.isInstalled &&
    a.canPrompt === b.canPrompt &&
    a.isIos === b.isIos &&
    a.isInAppBrowser === b.isInAppBrowser &&
    a.hintKind === b.hintKind &&
    a.showTopBanner === b.showTopBanner &&
    a.showMidFeedPromos === b.showMidFeedPromos
  );
}

export function getFamilyPwaInstallSnapshot(): FamilyPwaInstallSnapshot {
  bootstrapFamilyPwaInstall();
  if (!installed && readPersistedInstalled()) {
    installed = true;
    deferredPrompt = null;
  }
  const canPrompt = Boolean(deferredPrompt) && !installed;
  const ios = isIosDevice();
  const inApp = isInAppBrowser();

  let hintKind: FamilyPwaInstallHintKind = null;
  if (!installed && !canPrompt) {
    if (ios) hintKind = 'ios';
    else if (inApp) hintKind = 'in-app';
    else hintKind = 'android-manual';
  }

  const next: FamilyPwaInstallSnapshot = {
    isInstalled: installed,
    canPrompt,
    isIos: ios,
    isInAppBrowser: inApp,
    hintKind,
    showTopBanner: !installed && !isDismissed(TOP_BANNER_DISMISS_KEY, TOP_BANNER_COOLDOWN_MS),
    showMidFeedPromos: !installed && !isDismissed(MID_FEED_DISMISS_KEY, TOP_BANNER_COOLDOWN_MS),
  };

  if (snapshotsEqual(cachedSnapshot, next)) {
    return cachedSnapshot;
  }
  cachedSnapshot = next;
  return cachedSnapshot;
}

export async function promptFamilyPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  bootstrapFamilyPwaInstall();
  if (readStandalone()) {
    markInstalled();
    return 'accepted';
  }
  if (readPersistedInstalled()) {
    try {
      window.localStorage.removeItem(INSTALLED_KEY);
    } catch {
      /* ignore */
    }
    installed = false;
  }

  if (!deferredPrompt) {
    await ensureFamilyServiceWorkerRegistered();
    await waitForInstallPrompt(2500);
  }
  if (!deferredPrompt) return 'unavailable';

  const event = deferredPrompt;
  deferredPrompt = null;
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'accepted') {
      markInstalled();
    } else {
      notify();
    }
    return outcome;
  } catch {
    notify();
    return 'unavailable';
  }
}

export function dismissFamilyPwaTopBanner(): void {
  try {
    window.localStorage.setItem(TOP_BANNER_DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  notify();
}

export function dismissFamilyPwaMidFeedPromos(): void {
  try {
    window.localStorage.setItem(MID_FEED_DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  notify();
}

export function getFamilyPwaInstallHintText(kind: FamilyPwaInstallHintKind): string {
  switch (kind) {
    case 'ios':
      return 'در Safari: Share → Add to Home Screen';
    case 'in-app':
      return 'از منوی مرورگر داخل اپ، «باز کردن در مرورگر» را بزن و بعد نصب کن.';
    case 'android-manual':
      return 'از منوی مرورگر (⋮) گزینه Install app / نصب برنامه را بزن.';
    default:
      return '';
  }
}

export function useFamilyPwaInstall(): FamilyPwaInstallSnapshot {
  return useSyncExternalStore(
    subscribeFamilyPwaInstall,
    getFamilyPwaInstallSnapshot,
    () => SSR_SNAPSHOT,
  );
}

if (typeof window !== 'undefined') {
  bootstrapFamilyPwaInstall();
}
