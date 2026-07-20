'use client';

import { Bell } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFamilyUnreadCount } from '@/lib/family/hooks/useFamilyNotifications';

/** Floating notifications control for mobile — no full top header. */
export function FamilyMobileNotificationsButton({
  active,
  onOpen,
  onClose,
}: {
  active: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { unreadCount } = useFamilyUnreadCount(true);

  return (
    <button
      type="button"
      onClick={() => (active ? onClose() : onOpen())}
      aria-pressed={active || undefined}
      aria-label={active ? 'بستن اعلان‌ها' : 'اعلان‌ها'}
      title={active ? 'بستن اعلان‌ها' : 'اعلان‌ها'}
      className={cn(
        'family-mobile-notifications-btn fixed start-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 lg:hidden',
        active && 'family-mobile-notifications-btn--active',
      )}
    >
      <Bell className="family-mobile-notifications-btn__icon" strokeWidth={1.85} aria-hidden />
      {unreadCount > 0 ? (
        <span className="family-mobile-notifications-btn__badge" aria-hidden>
          {unreadCount > 9 ? '9+' : unreadCount.toLocaleString('en-US')}
        </span>
      ) : null}
    </button>
  );
}
