'use client';

/**
 * Family PWA Web Push — daily unread reminder subscription helpers.
 */

import {
  deleteFamilyPushSubscription,
  getFamilyPushStatus,
  getFamilyPushVapidPublicKey,
  saveFamilyPushSubscription,
} from '@/lib/family/api';

const OPT_IN_DISMISS_KEY = 'family-push-daily-dismissed';
const OPT_IN_COOLDOWN_MS = 7 * 24 * 60 * 60_000;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isFamilyPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia('(display-mode: standalone)').matches;
  const ios = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mq || ios;
}

export function familyPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function readFamilyPushDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(OPT_IN_DISMISS_KEY);
    if (!raw) return false;
    const at = Number.parseInt(raw, 10);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < OPT_IN_COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function dismissFamilyPushOptIn(): void {
  try {
    window.localStorage.setItem(OPT_IN_DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

async function resolveVapidPublicKey(): Promise<string | null> {
  const fromEnv = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (fromEnv) return fromEnv;
  try {
    const res = await getFamilyPushVapidPublicKey();
    return res.data.public_key || null;
  } catch {
    return null;
  }
}

async function readyRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) {
      await navigator.serviceWorker.ready;
      return existing;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function serializeSubscription(sub: PushSubscription): {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  contentEncoding?: string;
} {
  const json = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    keys: {
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
    },
    contentEncoding: 'aes128gcm',
  };
}

export type FamilyPushEnableResult =
  | 'subscribed'
  | 'denied'
  | 'unsupported'
  | 'no-sw'
  | 'unconfigured'
  | 'error';

/** Request permission + subscribe + persist to API. */
export async function enableFamilyDailyPush(): Promise<FamilyPushEnableResult> {
  if (!familyPushSupported()) return 'unsupported';

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

  if (permission !== 'granted') return 'denied';

  const registration = await readyRegistration();
  if (!registration) return 'no-sw';

  const vapidKey = await resolveVapidPublicKey();
  if (!vapidKey) return 'unconfigured';

  try {
    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
    }

    const payload = serializeSubscription(sub);
    if (!payload.keys.p256dh || !payload.keys.auth) return 'error';

    await saveFamilyPushSubscription(payload);
    return 'subscribed';
  } catch {
    return 'error';
  }
}

export async function disableFamilyDailyPush(): Promise<boolean> {
  try {
    const registration = await readyRegistration();
    const sub = await registration?.pushManager.getSubscription();
    if (sub) {
      await deleteFamilyPushSubscription(sub.endpoint).catch(() => undefined);
      await sub.unsubscribe().catch(() => undefined);
    }
    return true;
  } catch {
    return false;
  }
}

export async function getFamilyDailyPushState(): Promise<{
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  configured: boolean;
}> {
  if (!familyPushSupported()) {
    return { supported: false, permission: 'unsupported', subscribed: false, configured: false };
  }

  let subscribed = false;
  let configured = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim());

  try {
    const status = await getFamilyPushStatus();
    subscribed = status.data.subscribed;
    configured = status.data.configured || configured;
  } catch {
    const registration = await readyRegistration();
    const sub = await registration?.pushManager.getSubscription();
    subscribed = Boolean(sub);
  }

  return {
    supported: true,
    permission: Notification.permission,
    subscribed,
    configured,
  };
}

/** Best-effort app icon badge while the PWA is open. */
export async function syncFamilyAppBadge(count: number): Promise<void> {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (count > 0 && typeof nav.setAppBadge === 'function') {
      await nav.setAppBadge(Math.min(count, 99));
    } else if (count <= 0 && typeof nav.clearAppBadge === 'function') {
      await nav.clearAppBadge();
    }
  } catch {
    /* unsupported */
  }
}
