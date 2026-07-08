'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchPendingTicketsCount } from './academy/actions';
import { fetchChatbotOperatorQueueCount } from './chatbot/actions';

interface OperatorQueueAlertContextValue {
  pendingCount: number;
  ticketPendingCount: number;
  refreshPendingCount: () => Promise<void>;
}

const OperatorQueueAlertContext = createContext<OperatorQueueAlertContextValue | null>(null);

const POLL_ACTIVE_MS = 45_000;
const POLL_IDLE_MS = 120_000;
const BOOT_DEFER_MS = 4_000;

export function OperatorQueueAlertProvider({ children }: { children: React.ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [ticketPendingCount, setTicketPendingCount] = useState(0);
  const pendingRef = useRef(0);
  const ticketPendingRef = useRef(0);

  const refreshPendingCount = useCallback(async () => {
    try {
      const [chatbotTotal, ticketTotal] = await Promise.all([
        fetchChatbotOperatorQueueCount(),
        fetchPendingTicketsCount(),
      ]);
      pendingRef.current = chatbotTotal;
      ticketPendingRef.current = ticketTotal;
      setPendingCount(chatbotTotal);
      setTicketPendingCount(ticketTotal);
    } catch {
      pendingRef.current = 0;
      ticketPendingRef.current = 0;
      setPendingCount(0);
      setTicketPendingCount(0);
    }
  }, []);

  useEffect(() => {
    let timerId = 0;
    let bootTimerId = 0;
    let cancelled = false;

    const hasAlerts = () => pendingRef.current > 0 || ticketPendingRef.current > 0;

    const schedule = () => {
      window.clearTimeout(timerId);
      const delay = document.hidden ? POLL_IDLE_MS * 2 : hasAlerts() ? POLL_ACTIVE_MS : POLL_IDLE_MS;
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
  }, [refreshPendingCount]);

  const value = useMemo(
    () => ({ pendingCount, ticketPendingCount, refreshPendingCount }),
    [pendingCount, ticketPendingCount, refreshPendingCount],
  );

  return <OperatorQueueAlertContext.Provider value={value}>{children}</OperatorQueueAlertContext.Provider>;
}

export function useOperatorQueueAlert() {
  const ctx = useContext(OperatorQueueAlertContext);
  if (!ctx) throw new Error('useOperatorQueueAlert must be used within OperatorQueueAlertProvider');
  return ctx;
}
