'use client';

import { useLayoutEffect } from 'react';

type PerfNavigator = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

/**
 * Per-row effects (bubble backdrop-filter above all) are what make the feed crawl on
 * budget phones, and CSS alone cannot tell a budget phone from a flagship — both report
 * `pointer: coarse`. So we sample the coarse capability hints once and let the stylesheet
 * branch on the result.
 */
function isLiteTier(): boolean {
  if (typeof window === 'undefined') return false;

  const nav = navigator as PerfNavigator;
  if (nav.connection?.saveData) return true;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) return true;
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) return true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;

  return false;
}

/** Marks the family root so expensive per-row paint work can be dropped on weak devices. */
export function FamilyPerfTierBoot() {
  useLayoutEffect(() => {
    document
      .getElementById('family-root')
      ?.setAttribute('data-family-perf', isLiteTier() ? 'lite' : 'full');
  }, []);

  return null;
}
