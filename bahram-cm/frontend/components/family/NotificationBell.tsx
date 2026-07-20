'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { familyNotificationsHref } from '@/lib/domains';
import { useFamilyUnreadCount } from '@/lib/family/hooks/useFamilyNotifications';

export function NotificationBell() {
  const { unreadCount } = useFamilyUnreadCount(true);

  return (
    <Link
      href={familyNotificationsHref()}
      aria-label="اعلان‌ها"
      className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-bone/80 transition hover:bg-white/10"
    >
      <Bell className="h-4.5 w-4.5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-charcoal">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
