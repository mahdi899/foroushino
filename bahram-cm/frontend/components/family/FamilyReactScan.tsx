'use client';

import { useEffect } from 'react';

/**
 * Dev-only React Scan overlay for `/family` re-render analysis.
 * Enable with `?familyScan=1` or `localStorage.family-react-scan=1`.
 * Pair with React DevTools Profiler ("Record why each component rendered").
 */
export function FamilyReactScan() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (typeof window === 'undefined') return;

    let enabled = false;
    try {
      const q = new URLSearchParams(window.location.search).get('familyScan');
      if (q === '1') enabled = true;
      if (q === '0') enabled = false;
      if (q == null) enabled = window.localStorage.getItem('family-react-scan') === '1';
    } catch {
      return;
    }

    if (!enabled) return;

    let cancelled = false;
    void import('react-scan').then(({ scan }) => {
      if (cancelled) return;
      scan({
        enabled: true,
        showToolbar: true,
        animationSpeed: 'fast',
      });
      // eslint-disable-next-line no-console
      console.info(
        '%c[family] React Scan ON',
        'color:#e11d48;font-weight:700',
        '\n  Profiler ritual: DevTools → Profiler → enable "Why did this render?"',
        '\n  Then: scroll, publish, pin-jump → familyDebug.snapshot()',
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
