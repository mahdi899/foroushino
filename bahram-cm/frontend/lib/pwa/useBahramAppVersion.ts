'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BUILD_HASH, BUILD_VERSION } from '@/lib/pwa/build-info.generated';

export type UpdateType = 'forced' | 'optional' | 'silent';

interface ServerVersion {
  version: string;
  buildHash: string;
  buildTime: string;
  timestamp: number;
  updateType: UpdateType;
  minVersion: string;
}

export interface BahramAppVersionState {
  currentVersion: string;
  currentHash: string;
  latestVersion: string | null;
  latestHash: string | null;
  updateType: UpdateType | null;
  hasUpdate: boolean;
  isChecking: boolean;
}

const CHECK_INTERVAL = 15 * 60_000;
const INITIAL_DELAY = 10_000;
const DISMISSED_KEY = 'bahram_update_dismissed';
const UPDATE_ATTEMPTED_KEY = 'bahram_update_attempted';
const DISMISS_COOLDOWN = 60 * 60_000;
const UPDATE_COOLDOWN = 10 * 60_000;

function parseSemver(v: string): [number, number, number] {
  const parts = v.replace(/[^0-9.]/g, '').split('.').map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function isNewerVersion(server: string, client: string): boolean {
  const [sMaj, sMin, sPat] = parseSemver(server);
  const [cMaj, cMin, cPat] = parseSemver(client);
  if (sMaj !== cMaj) return sMaj > cMaj;
  if (sMin !== cMin) return sMin > cMin;
  return sPat > cPat;
}

function isBelowMinVersion(client: string, min: string): boolean {
  return isNewerVersion(min, client);
}

function readStored(key: string): { hash: string; at: number } | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { hash: string; at: number }) : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, hash: string): void {
  try {
    localStorage.setItem(key, JSON.stringify({ hash, at: Date.now() }));
  } catch {
    /* quota */
  }
}

function notifyServiceWorker(type: string) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type });
  }
}

async function nukeCaches(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }
  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
  }
}

export function useBahramAppVersion() {
  const currentVersion = BUILD_VERSION as string;
  const currentHash = BUILD_HASH as string;

  const [state, setState] = useState<BahramAppVersionState>({
    currentVersion,
    currentHash,
    latestVersion: null,
    latestHash: null,
    updateType: null,
    hasUpdate: false,
    isChecking: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('_update')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (process.env.NODE_ENV !== 'production') return;
    if (currentHash === 'dev') return;

    try {
      setState((prev) => ({ ...prev, isChecking: true }));

      const cacheBust = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const res = await fetch(`/version.json?_t=${cacheBust}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const server = (await res.json()) as ServerVersion;

      if (server.buildHash === currentHash) {
        localStorage.removeItem(UPDATE_ATTEMPTED_KEY);
        localStorage.removeItem(DISMISSED_KEY);
        setState((prev) => ({ ...prev, isChecking: false, hasUpdate: false }));
        return;
      }

      const attempted = readStored(UPDATE_ATTEMPTED_KEY);
      if (attempted && attempted.hash === server.buildHash && Date.now() - attempted.at < UPDATE_COOLDOWN) {
        setState((prev) => ({ ...prev, isChecking: false, hasUpdate: false }));
        return;
      }

      const dismissed = readStored(DISMISSED_KEY);
      if (dismissed && dismissed.hash === server.buildHash && Date.now() - dismissed.at < DISMISS_COOLDOWN) {
        setState((prev) => ({ ...prev, isChecking: false, hasUpdate: false }));
        return;
      }

      let effectiveType: UpdateType = server.updateType || 'optional';
      if (isBelowMinVersion(currentVersion, server.minVersion)) {
        effectiveType = 'forced';
      }

      if (effectiveType === 'silent') {
        notifyServiceWorker('SKIP_WAITING');
        setState((prev) => ({
          ...prev,
          isChecking: false,
          latestVersion: server.version,
          latestHash: server.buildHash,
          updateType: 'silent',
          hasUpdate: false,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        latestVersion: server.version,
        latestHash: server.buildHash,
        updateType: effectiveType,
        hasUpdate: true,
        isChecking: false,
      }));
    } catch {
      setState((prev) => ({ ...prev, isChecking: false }));
    }
  }, [currentHash, currentVersion]);

  useEffect(() => {
    const initialTimeout = setTimeout(() => void checkForUpdate(), INITIAL_DELAY);
    intervalRef.current = setInterval(() => void checkForUpdate(), CHECK_INTERVAL);

    let lastVisCheck = 0;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastVisCheck > 60_000) {
        lastVisCheck = Date.now();
        void checkForUpdate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkForUpdate]);

  const applyUpdate = useCallback(async () => {
    if (state.latestHash) {
      writeStored(UPDATE_ATTEMPTED_KEY, state.latestHash);
    }

    try {
      notifyServiceWorker('SKIP_WAITING');
      await nukeCaches();
      const bust = Date.now();
      window.location.replace(`${window.location.origin}${window.location.pathname}?_update=${bust}`);
    } catch {
      window.location.reload();
    }
  }, [state.latestHash]);

  const dismissUpdate = useCallback(() => {
    if (state.latestHash) {
      writeStored(DISMISSED_KEY, state.latestHash);
    }
    setState((prev) => ({ ...prev, hasUpdate: false }));
  }, [state.latestHash]);

  return { ...state, applyUpdate, dismissUpdate };
}
