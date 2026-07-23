'use client';

/**
 * Family PWA install state — captures `beforeinstallprompt` at module load
 * so the event is not lost before React mounts.
 */

import { useSyncExternalStore } from 'react';

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type FamilyPwaInstallHintKind = 'ios' | 'android-manual' | 'in-app' | null;

type Listener = () => void;

const TOP_BANNER_DISMISS_KEY = 'family-pwa-install-dismissed';
const MID_FEED_DISMISS_KEY = 'family-pwa-mid-install-dismissed';
const TOP_BANNER_COOLDOWN_MS = 4 * 24 * 60 * 60_000;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
let bootstrapped = false;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

function readStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mq || iosStandalone;
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

export function bootstrapFamilyPwaInstall(): void {
  if (typeof window === 'undefined' || bootstrapped) return;
  bootstrapped = true;

  installed = readStandalone();

  const onBeforeInstall = (event: Event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  };

  const onInstalled = () => {
    deferredPrompt = null;
    installed = true;
    notify();
  };

  const onDisplayMode = () => {
    if (readStandalone()) {
      installed = true;
      deferredPrompt = null;
      notify();
    }
  };

  window.addEventListener('beforeinstallprompt', onBeforeInstall);
  window.addEventListener('appinstalled', onInstalled);
  window.matchMedia('(display-mode: standalone)').addEventListener('change', onDisplayMode);
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
  if (installed) return 'accepted';
  if (!deferredPrompt) return 'unavailable';

  const event = deferredPrompt;
  deferredPrompt = null;
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'accepted') {
      installed = true;
    }
    notify();
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
