import { PanelPageFallback } from '@/components/student-panel/layout/PanelPageFallback';

/**
 * Instant loading boundary for in-panel navigations.
 * Without this, App Router keeps the previous page on screen until the
 * destination RSC (with its API awaits) finishes — which feels stuck.
 */
export default function PanelShellSegmentLoading() {
  return <PanelPageFallback />;
}
