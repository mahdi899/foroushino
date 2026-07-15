'use client';

import useSWR from 'swr';
import { getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } from '@/lib/family/api';
import { usePageVisible } from '@/lib/family/hooks/usePageVisible';
import { familySwrDefaults } from '@/lib/family/swr';
import type { FamilyNotification } from '@/lib/family/types';

export function useFamilyUnreadCount(enabled: boolean) {
  const pageVisible = usePageVisible();

  const { data, mutate } = useSWR(
    enabled && pageVisible ? 'family-notifications-unread' : null,
    async () => {
      try {
        return (await getUnreadNotificationCount()).data;
      } catch {
        return { unread_count: 0 };
      }
    },
    { refreshInterval: pageVisible ? 120_000 : 0, ...familySwrDefaults },
  );

  return { unreadCount: data?.unread_count ?? 0, refresh: mutate };
}

export function useFamilyNotifications(enabled: boolean) {
  const { data, isLoading, mutate } = useSWR(
    enabled ? 'family-notifications' : null,
    async () => {
      try {
        return (await getNotifications()) as { data: FamilyNotification[] };
      } catch {
        return { data: [] as FamilyNotification[] };
      }
    },
    { ...familySwrDefaults },
  );

  return {
    notifications: data?.data ?? [],
    isLoading,
    markRead: async (id: number) => {
      const readAt = new Date().toISOString();
      await mutate(
        (current) => {
          if (!current) return current;
          return {
            data: current.data.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? readAt } : n)),
          };
        },
        { revalidate: false },
      );
      try {
        await markNotificationRead(id);
      } finally {
        await mutate();
      }
    },
    markAllRead: async () => {
      const readAt = new Date().toISOString();
      await mutate(
        (current) => {
          if (!current) return current;
          return {
            data: current.data.map((n) => ({ ...n, read_at: n.read_at ?? readAt })),
          };
        },
        { revalidate: false },
      );
      try {
        await markAllNotificationsRead();
      } finally {
        await mutate();
      }
    },
  };
}
