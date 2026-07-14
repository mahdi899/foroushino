'use client';

import useSWR from 'swr';
import { getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } from '@/lib/family/api';
import type { FamilyNotification } from '@/lib/family/types';

export function useFamilyUnreadCount(enabled: boolean) {
  const { data, mutate } = useSWR(
    enabled ? 'family-notifications-unread' : null,
    async () => (await getUnreadNotificationCount()).data,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  );

  return { unreadCount: data?.unread_count ?? 0, refresh: mutate };
}

export function useFamilyNotifications(enabled: boolean) {
  const { data, isLoading, mutate } = useSWR(
    enabled ? 'family-notifications' : null,
    async () => (await getNotifications()) as { data: FamilyNotification[] },
    { revalidateOnFocus: false },
  );

  return {
    notifications: data?.data ?? [],
    isLoading,
    markRead: async (id: number) => {
      await markNotificationRead(id);
      await mutate();
    },
    markAllRead: async () => {
      await markAllNotificationsRead();
      await mutate();
    },
  };
}
