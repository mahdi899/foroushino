'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SiteLoader } from '@/components/layout/SiteLoader';

const MIN_VISIBLE_MS = 420;
const FADE_MS = 380;
const BOOT_DONE_KEY = 'site-boot-done';

function isBareShellPath(pathname: string | null | undefined): boolean {
  return Boolean(
    pathname?.startsWith('/admin') ||
      pathname?.startsWith('/panel') ||
      pathname?.startsWith('/family'),
  );
}

function readBootDone(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(BOOT_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

function markBootDone(): void {
  try {
    sessionStorage.setItem(BOOT_DONE_KEY, '1');
  } catch {
    /* ignore */
  }
}

/**
 * Branded boot overlay — first full site paint only.
 * In-app navigations (e.g. bottom nav «خانه») use app/loading.tsx instead.
 */
export function SiteBootLoader() {
  const pathname = usePathname();
  const isBareShell = isBareShellPath(pathname);
  // Always start hidden so SSR matches the first client paint (sessionStorage is client-only).
  const [phase, setPhase] = useState<'visible' | 'fading' | 'done'>('done');

  useEffect(() => {
    if (isBareShell || readBootDone()) return;

    setPhase('visible');
    const started = Date.now();

    const finish = () => {
      markBootDone();
      const elapsed = Date.now() - started;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
      window.setTimeout(() => setPhase('fading'), wait);
      window.setTimeout(() => setPhase('done'), wait + FADE_MS);
    };

    if (document.readyState === 'complete') {
      finish();
    } else {
      window.addEventListener('load', finish, { once: true });
      return () => window.removeEventListener('load', finish);
    }
  }, [isBareShell]);

  if (phase === 'done') return null;

  return (
    <div
      className={`site-boot-loader${phase === 'fading' ? ' site-boot-loader--out' : ''}`}
      aria-hidden={phase === 'fading'}
    >
      <div className="site-boot-loader__backdrop" />
      <SiteLoader size="lg" variant="page" label="در حال بارگذاری..." />
    </div>
  );
}
