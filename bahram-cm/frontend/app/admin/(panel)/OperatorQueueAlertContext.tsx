'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchAdminNavBadgeCounts } from '@/lib/admin/fetchNavBadgeCounts';
import {
  buildAdminNavBadgeCountsFromSummary,
  EMPTY_ADMIN_NAV_BADGE_COUNTS,
  hasAnyAdminNavBadge,
  type AdminNavBadgeCounts,
} from '@/lib/admin/navBadges';
import type { DashboardSummary } from '@/lib/admin/dashboardTypes';

interface OperatorQueueAlertContextValue {
  pendingCount: number;
  ticketPendingCount: number;
  navBadgeCounts: AdminNavBadgeCounts;
  refreshPendingCount: () => Promise<void>;
  syncBadgeCounts: (summary: DashboardSummary) => void;
}

const OperatorQueueAlertContext = createContext<OperatorQueueAlertContextValue | null>(null);

const POLL_ACTIVE_MS = 45_000;
const POLL_IDLE_MS = 120_000;
const BOOT_DEFER_MS = 6_000;

export function OperatorQueueAlertProvider({
  children,
  pollingEnabled = true,
}: {
  children: React.ReactNode;
  pollingEnabled?: boolean;
}) {
  const [navBadgeCounts, setNavBadgeCounts] = useState<AdminNavBadgeCounts>(EMPTY_ADMIN_NAV_BADGE_COUNTS);
  const countsRef = useRef<AdminNavBadgeCounts>(EMPTY_ADMIN_NAV_BADGE_COUNTS);

  const applyCounts = useCallback((next: AdminNavBadgeCounts) => {
    countsRef.current = next;
    setNavBadgeCounts(next);
  }, []);

  const syncBadgeCounts = useCallback(
    (summary: DashboardSummary) => {
      applyCounts(buildAdminNavBadgeCountsFromSummary(summary));
    },
    [applyCounts],
  );

  const refreshPendingCount = useCallback(async () => {
    try {
      applyCounts(await fetchAdminNavBadgeCounts());
    } catch {
      applyCounts(EMPTY_ADMIN_NAV_BADGE_COUNTS);
    }
  }, [applyCounts]);

  useEffect(() => {
    if (!pollingEnabled) return;

    let timerId = 0;
    let bootTimerId = 0;
    let cancelled = false;

    const schedule = () => {
      window.clearTimeout(timerId);
      const delay = document.hidden ? POLL_IDLE_MS * 2 : hasAnyAdminNavBadge(countsRef.current) ? POLL_ACTIVE_MS : POLL_IDLE_MS;
      timerId = window.setTimeout(async () => {
        if (!document.hidden && !cancelled) await refreshPendingCount();
        if (!cancelled) schedule();
      }, delay);
    };

    const startPolling = () => {
      if (cancelled) return;
      void refreshPendingCount();
      schedule();
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(() => startPolling(), { timeout: BOOT_DEFER_MS });
      bootTimerId = window.setTimeout(() => {
        window.cancelIdleCallback(idleId);
        startPolling();
      }, BOOT_DEFER_MS);
    } else {
      bootTimerId = window.setTimeout(startPolling, BOOT_DEFER_MS);
    }

    const onVisibility = () => {
      if (!document.hidden) void refreshPendingCount();
      schedule();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
      window.clearTimeout(bootTimerId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refreshPendingCount, pollingEnabled]);

  const value = useMemo(
    () => ({
      pendingCount: navBadgeCounts.chatbot,
      ticketPendingCount: navBadgeCounts.tickets,
      navBadgeCounts,
      refreshPendingCount,
      syncBadgeCounts,
    }),
    [navBadgeCounts, refreshPendingCount, syncBadgeCounts],
  );

  return <OperatorQueueAlertContext.Provider value={value}>{children}</OperatorQueueAlertContext.Provider>;
}

export function useOperatorQueueAlert() {
  const ctx = useContext(OperatorQueueAlertContext);
  if (!ctx) throw new Error('useOperatorQueueAlert must be used within OperatorQueueAlertProvider');
  return ctx;
}
