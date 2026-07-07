'use client';

import { Analytics } from '@/components/analytics/Analytics';
import { usePerformanceConfig } from '@/components/performance/PerformanceProvider';

/** Loads analytics with strategy controlled by admin cache settings. */
export function AnalyticsGate() {
  const perf = usePerformanceConfig();
  const defer = perf?.defer_analytics !== false;
  return <Analytics defer={defer} />;
}
