'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  fetchRecentNotifications,
  fetchUnreadNotificationCount,
  type PanelNotificationPayload,
} from '@/lib/student/panelActions';
import { NotificationToastStack } from '@/components/student-panel/notifications/NotificationToastStack';
import { shouldShowNotificationToast } from '@/components/student-panel/notifications/notificationMeta';

const POLL_ACTIVE_MS = 8_000;
const POLL_IDLE_MS = 30_000;
const BASELINE_STORAGE_KEY = 'panel-notification-toast-baseline-v2';

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
      const [count, notifications] = await Promise.all([
        fetchUnreadNotificationCount(),
        fetchRecentNotifications(30, true),
      ]);

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
        const [count, notifications] = await Promise.all([
          fetchUnreadNotificationCount(),
          fetchRecentNotifications(30, false),
        ]);
        if (cancelled) return;

        const maxId = maxNotificationId(notifications);
        if (knownMaxIdRef.current <= 0) {
          knownMaxIdRef.current = maxId;
          writeStoredBaseline(maxId);
        }

        lastUnreadCountRef.current = count;
        updateUnreadCount(count);
      } finally {
        if (!cancelled) {
          bootstrappedRef.current = true;
        }
      }
    };

    const schedule = () => {
      window.clearTimeout(timerId);
      const delay = document.hidden ? POLL_IDLE_MS : POLL_ACTIVE_MS;
      timerId = window.setTimeout(async () => {
        if (!cancelled) await pollNotifications();
        if (!cancelled) schedule();
      }, delay);
    };

    const start = async () => {
      await bootstrap();
      if (cancelled) return;
      await pollNotifications();
      schedule();
    };

    void start();

    const onVisibility = () => {
      if (!document.hidden) void pollNotifications();
      schedule();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pollNotifications, updateUnreadCount]);

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
