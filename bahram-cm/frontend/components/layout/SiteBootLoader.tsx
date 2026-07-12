'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SiteLoader } from '@/components/layout/SiteLoader';

const MIN_VISIBLE_MS = 420;
const FADE_MS = 380;

/**
 * Branded boot overlay — shows on first paint until the page is ready,
 * then fades out. Skipped on admin/panel routes.
 */
export function SiteBootLoader() {
  const pathname = usePathname();
  const isBareShell = pathname?.startsWith('/admin') || pathname?.startsWith('/panel');
  const [phase, setPhase] = useState<'visible' | 'fading' | 'done'>(() =>
    isBareShell ? 'done' : 'visible',
  );

  useEffect(() => {
    if (isBareShell) {
      setPhase('done');
      return;
    }

    setPhase('visible');
    const started = Date.now();

    const finish = () => {
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
  }, [isBareShell, pathname]);

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
