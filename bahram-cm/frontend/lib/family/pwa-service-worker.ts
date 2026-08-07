'use client';

import { isFamilyHost } from '@/lib/domains';

/** SW scope for club apex (`/`) vs legacy `/family/` path. */
export function familyServiceWorkerScope(): string {
  if (typeof window !== 'undefined' && isFamilyHost(window.location.hostname)) {
    return '/';
  }
  return '/family/';
}

/** Register `/sw-family.js` when missing (required for Chromium install prompt). */
export async function ensureFamilyServiceWorkerRegistered(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  const scope = familyServiceWorkerScope();
  const registrations = await navigator.serviceWorker.getRegistrations();
  const existing = registrations.find((registration) => {
    try {
      const path = new URL(registration.scope).pathname;
      return path === scope || path === `${scope}/`;
    } catch {
      return false;
    }
  });
  if (existing?.active) {
    return existing;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw-family.js', { scope });
    await navigator.serviceWorker.ready;
    return registration;
  } catch {
    return null;
  }
}
