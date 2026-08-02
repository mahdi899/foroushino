'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  fetchNotificationsPage,
  fetchRecentNotifications,
  fetchUnreadNotificationCount,
  type PanelNotificationPayload,
} from '@/lib/student/panelActions';
import { NotificationToastStack } from '@/components/student-panel/notifications/NotificationToastStack';
import { shouldShowNotificationToast } from '@/components/student-panel/notifications/notificationMeta';

// Every logged-in panel tab hits the API on this cadence, so the interval is the
// single biggest driver of backend load. Poll slowly by default and back off
// further while nothing new arrives; a real notification still lands within ~30s.
const POLL_ACTIVE_MS = 30_000;
const POLL_IDLE_MS = 180_000;
const POLL_BACKOFF_MAX_MS = 120_000;
const POLL_BACKOFF_STEP = 1.5;
const BASELINE_STORAGE_KEY = 'panel-notification-toast-baseline-v3';

interface PanelNotificationContextValue {
  unreadCount: number;
}

const PanelNotificationContext = createContext<PanelNotificationContextValue | null>(null);

function readStoredBaseline(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = sessionStorage.getItem(BASELINE_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeStoredBaseline(id: number) {
  try {
    sessionStorage.setItem(BASELINE_STORAGE_KEY, String(id));
  } catch {
    /* ignore */
  }
}

function maxNotificationId(notifications: PanelNotificationPayload[]): number {
  return notifications.reduce((max, item) => Math.max(max, item.id), 0);
}

function maxReadNotificationId(notifications: PanelNotificationPayload[]): number {
  return notifications
    .filter((item) => item.read_at)
    .reduce((max, item) => Math.max(max, item.id), 0);
}

export function PanelNotificationProvider({
  initialUnreadCount,
  onUnreadCountChange,
  children,
}: {
  initialUnreadCount: number;
  onUnreadCountChange: (count: number) => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [toasts, setToasts] = useState<PanelNotificationPayload[]>([]);
  const knownMaxIdRef = useRef(readStoredBaseline());
  const lastUnreadCountRef = useRef(initialUnreadCount);
  const toastedIdsRef = useRef<Set<number>>(new Set());
  const bootstrappedRef = useRef(false);
  const activeDelayRef = useRef(POLL_ACTIVE_MS);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const updateUnreadCount = useCallback(
    (count: number) => {
      setUnreadCount(count);
      onUnreadCountChange(count);
    },
    [onUnreadCountChange],
  );

  const pushToasts = useCallback((fresh: PanelNotificationPayload[]) => {
    const toastable = fresh.filter(shouldShowNotificationToast);
    if (toastable.length === 0) return;

    for (const item of toastable) {
      toastedIdsRef.current.add(item.id);
    }

    setToasts((prev) => {
      const existing = new Set(prev.map((item) => item.id));
      return [...prev, ...toastable.filter((item) => !existing.has(item.id))].slice(-4);
    });
  }, []);

  const pollNotifications = useCallback(async () => {
    if (!bootstrappedRef.current || pathname === '/panel/notifications') return;

    try {
      // One request per poll: the unread-only page already reports the total, so the
      // separate unread-count call was doubling panel traffic for no new data.
      const { items: notifications, total: count } = await fetchNotificationsPage(30, true);

      if (count === lastUnreadCountRef.current) {
        activeDelayRef.current = Math.min(
          POLL_BACKOFF_MAX_MS,
          Math.round(activeDelayRef.current * POLL_BACKOFF_STEP),
        );
      } else {
        activeDelayRef.current = POLL_ACTIVE_MS;
      }

      updateUnreadCount(count);

      const baseline = knownMaxIdRef.current;
      let fresh = notifications
        .filter(
          (item) =>
            shouldShowNotificationToast(item) &&
            !item.read_at &&
            item.id > baseline &&
            !toastedIdsRef.current.has(item.id),
        )
        .sort((a, b) => a.id - b.id);

      if (fresh.length === 0 && count > lastUnreadCountRef.current) {
        const newestUnread = notifications
          .filter((item) => shouldShowNotificationToast(item) && !item.read_at && !toastedIdsRef.current.has(item.id))
          .sort((a, b) => b.id - a.id)[0];

        if (newestUnread && newestUnread.id > baseline) {
          fresh = [newestUnread];
        }
      }

      lastUnreadCountRef.current = count;

      const latestId = Math.max(baseline, maxNotificationId(notifications));
      if (latestId > baseline) {
        knownMaxIdRef.current = latestId;
        writeStoredBaseline(latestId);
      }

      pushToasts(fresh);
    } catch {
      /* ignore polling errors */
    }
  }, [pathname, pushToasts, updateUnreadCount]);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
    lastUnreadCountRef.current = initialUnreadCount;
  }, [initialUnreadCount]);

  useEffect(() => {
    let cancelled = false;
    let timerId = 0;

    const bootstrap = async () => {
      try {
        if (initialUnreadCount <= 0) {
          const count = await fetchUnreadNotificationCount();
          if (cancelled) return;
          lastUnreadCountRef.current = count;
          updateUnreadCount(count);
        }

        const loadRecent = () => {
          void fetchRecentNotifications(30, false).then((notifications) => {
            if (cancelled) return;

            const maxId = maxNotificationId(notifications);
            if (knownMaxIdRef.current <= 0) {
              const readBaseline = maxReadNotificationId(notifications);
              knownMaxIdRef.current = readBaseline;
              writeStoredBaseline(readBaseline);
            }

            const freshOnBootstrap = notifications
              .filter(
                (item) =>
                  shouldShowNotificationToast(item) &&
                  !item.read_at &&
                  item.id > knownMaxIdRef.current &&
                  !toastedIdsRef.current.has(item.id),
              )
              .sort((a, b) => a.id - b.id);

            pushToasts(freshOnBootstrap);

            if (maxId > knownMaxIdRef.current) {
              knownMaxIdRef.current = maxId;
              writeStoredBaseline(maxId);
            }
          });
        };

        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(loadRecent, { timeout: 3000 });
        } else {
          window.setTimeout(loadRecent, 1200);
        }
      } finally {
        if (!cancelled) {
          bootstrappedRef.current = true;
        }
      }
    };

    const schedule = () => {
      window.clearTimeout(timerId);
      const delay = document.hidden ? POLL_IDLE_MS : activeDelayRef.current;
      timerId = window.setTimeout(async () => {
        if (!cancelled) await pollNotifications();
        if (!cancelled) schedule();
      }, delay);
    };

    const start = async () => {
      await bootstrap();
      if (cancelled) return;
      schedule();
    };

    void start();

    const onVisibility = () => {
      if (!document.hidden) {
        activeDelayRef.current = POLL_ACTIVE_MS;
        void pollNotifications();
      }
      schedule();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [initialUnreadCount, pollNotifications, pushToasts, updateUnreadCount]);

  useEffect(() => {
    if (pathname !== '/panel/notifications') return;

    setToasts([]);

    void fetchRecentNotifications(30).then((notifications) => {
      const maxId = maxNotificationId(notifications);
      if (maxId > 0) {
        knownMaxIdRef.current = maxId;
        writeStoredBaseline(maxId);
        notifications.forEach((item) => toastedIdsRef.current.add(item.id));
      }
      lastUnreadCountRef.current = 0;
      updateUnreadCount(0);
    });
  }, [pathname, updateUnreadCount]);

  const value = useMemo(() => ({ unreadCount }), [unreadCount]);

  return (
    <PanelNotificationContext.Provider value={value}>
      {children}
      <NotificationToastStack toasts={toasts} onDismiss={dismissToast} />
    </PanelNotificationContext.Provider>
  );
}

export function usePanelNotifications() {
  const ctx = useContext(PanelNotificationContext);
  if (!ctx) {
    throw new Error('usePanelNotifications must be used within PanelNotificationProvider');
  }
  return ctx;
}
