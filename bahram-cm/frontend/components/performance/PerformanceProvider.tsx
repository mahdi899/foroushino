'use client';

import { createContext, useContext } from 'react';
import type { PublicPerfConfig } from '@/lib/cache/types';

const PerformanceContext = createContext<PublicPerfConfig | null>(null);

export function PerformanceProvider({
  config,
  children,
}: {
  config: PublicPerfConfig;
  children: React.ReactNode;
}) {
  return <PerformanceContext.Provider value={config}>{children}</PerformanceContext.Provider>;
}

export function usePerformanceConfig(): PublicPerfConfig | null {
  return useContext(PerformanceContext);
}

/** Whether images below the fold should lazy-load. */
export function useLazyImages(): boolean {
  return usePerformanceConfig()?.lazy_load_images !== false;
}

/** Whether internal links should prefetch in viewport. */
export function usePrefetchLinks(): boolean {
  return usePerformanceConfig()?.prefetch_links === true;
}
