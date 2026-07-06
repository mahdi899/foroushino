'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { fetchChatbotOperatorQueueCount } from './chatbot/actions';

interface OperatorQueueAlertContextValue {
  pendingCount: number;
  refreshPendingCount: () => Promise<void>;
}

const OperatorQueueAlertContext = createContext<OperatorQueueAlertContextValue | null>(null);

const POLL_ACTIVE_MS = 30_000;
const POLL_IDLE_MS = 90_000;

export function OperatorQueueAlertProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldPoll = pathname === '/admin' || pathname.startsWith('/admin/chatbot');
  const [pendingCount, setPendingCount] = useState(0);
  const pendingRef = useRef(0);

  const refreshPendingCount = useCallback(async () => {
    try {
      const total = await fetchChatbotOperatorQueueCount();
      pendingRef.current = total;
      setPendingCount(total);
    } catch {
      pendingRef.current = 0;
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    if (!shouldPoll) {
      pendingRef.current = 0;
      setPendingCount(0);
      return;
    }

    let timerId = 0;

    const schedule = () => {
      window.clearTimeout(timerId);
      const delay = document.hidden
        ? POLL_IDLE_MS * 2
        : pendingRef.current > 0
          ? POLL_ACTIVE_MS
          : POLL_IDLE_MS;
      timerId = window.setTimeout(async () => {
        if (!document.hidden) await refreshPendingCount();
        schedule();
      }, delay);
    };

    void refreshPendingCount();
    schedule();

    const onVisibility = () => {
      if (!document.hidden) void refreshPendingCount();
      schedule();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refreshPendingCount, shouldPoll]);

  const value = useMemo(
    () => ({ pendingCount, refreshPendingCount }),
    [pendingCount, refreshPendingCount],
  );

  return <OperatorQueueAlertContext.Provider value={value}>{children}</OperatorQueueAlertContext.Provider>;
}

export function useOperatorQueueAlert() {
  const ctx = useContext(OperatorQueueAlertContext);
  if (!ctx) throw new Error('useOperatorQueueAlert must be used within OperatorQueueAlertProvider');
  return ctx;
}
