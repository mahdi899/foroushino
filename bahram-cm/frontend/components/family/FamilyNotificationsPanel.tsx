'use client';

import Link from 'next/link';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatRelativeTimeFa } from '@/components/student-panel/utils/relativeTime';
import { useFamilyNotifications, useFamilyUnreadCount } from '@/lib/family/hooks/useFamilyNotifications';
import type { FamilyNotification } from '@/lib/family/types';
import {
  familyNotificationIcon,
  familyNotificationVariant,
} from '@/components/family/familyNotificationMeta';

function NotificationSkeleton({ index }: { index: number }) {
  return (
    <div
      className="family-notif-row family-notif-row--skeleton"
      style={{ animationDelay: `${index * 55}ms` }}
      aria-hidden
    >
      <div className="family-notif-row__inner">
        <div className="family-notif-row__avatar family-notif-skel-block rounded-full" />
        <div className="family-notif-row__body min-w-0 flex-1">
          <div className="family-notif-row__head">
            <div className="family-notif-skel-line h-3.5 w-[58%] rounded-full" />
            <div className="family-notif-skel-line h-2.5 w-10 shrink-0 rounded-full" />
          </div>
          <div className="family-notif-skel-line mt-2 h-3 w-full rounded-full" />
          <div className="family-notif-skel-line mt-1.5 h-3 w-[72%] rounded-full" />
        </div>
      </div>
      <div className="family-notif-row__divider" />
    </div>
  );
}

function NotificationRow({
  notification,
  index,
  onRead,
}: {
  notification: FamilyNotification;
  index: number;
  onRead: (id: number) => void;
}) {
  const isUnread = !notification.read_at;
  const Icon = familyNotificationIcon(notification.type);
  const variant = familyNotificationVariant(notification.type);
  const hasLink = Boolean(notification.link?.trim());

  const handleRead = () => {
    if (isUnread) onRead(notification.id);
  };

  const rowContent = (
    <>
      <div className="family-notif-row__inner">
        <div
          className={cn(
            'family-notif-row__avatar',
            `family-notif-row__avatar--${variant}`,
            !isUnread && 'family-notif-row__avatar--read',
          )}
        >
          <Icon className="family-notif-row__avatar-icon" strokeWidth={1.75} aria-hidden />
          {isUnread && <span className="family-notif-row__badge" aria-hidden />}
        </div>

        <div className="family-notif-row__body">
          <div className="family-notif-row__head">
            <h4 className={cn('family-notif-row__title', isUnread && 'family-notif-row__title--unread')}>
              {notification.title}
            </h4>
            <time className="family-notif-row__time" dateTime={notification.created_at}>
              {formatRelativeTimeFa(notification.created_at)}
            </time>
          </div>
          <p className="family-notif-row__preview">{notification.body}</p>
          {hasLink && (
            <span className="family-notif-row__action">
              {notification.link_label ?? 'مشاهده'}
              <ChevronRight className="family-notif-row__action-icon" strokeWidth={2.25} aria-hidden />
            </span>
          )}
        </div>
      </div>
      <div className="family-notif-row__divider" aria-hidden />
    </>
  );

  const rowClass = cn(
    'family-notif-row',
    isUnread && 'family-notif-row--unread',
    hasLink && 'family-notif-row--linked',
  );

  const enterStyle = { animationDelay: `${Math.min(index, 14) * 48}ms` };

  if (hasLink && notification.link) {
    return (
      <Link
        href={notification.link}
        className={rowClass}
        style={enterStyle}
        onClick={handleRead}
        aria-label={`${notification.title}. ${notification.body}`}
      >
        {rowContent}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={rowClass}
      style={enterStyle}
      onClick={handleRead}
      disabled={!isUnread}
      aria-label={
        isUnread
          ? `${notification.title}. ${notification.body}. علامت‌گذاری به‌عنوان خوانده‌شده`
          : `${notification.title}. ${notification.body}`
      }
    >
      {rowContent}
    </button>
  );
}

function NotificationsEmpty() {
  return (
    <div className="family-notif-empty" role="status">
      <div className="family-notif-empty__glow" aria-hidden />
      <span className="family-notif-empty__icon">
        <Bell strokeWidth={1.5} aria-hidden />
      </span>
      <p className="family-notif-empty__title">اعلان جدیدی ندارید</p>
      <p className="family-notif-empty__hint">وقتی خبری از خانواده باشد، اینجا می‌بینید</p>
    </div>
  );
}

export function FamilyNotificationsPanel({
  onClose,
  className,
  enabled = true,
}: {
  onClose?: () => void;
  className?: string;
  enabled?: boolean;
}) {
  const { notifications, isLoading, markRead, markAllRead } = useFamilyNotifications(enabled);
  const { refresh: refreshUnread } = useFamilyUnreadCount(enabled);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const handleMarkAll = async () => {
    await markAllRead();
    await refreshUnread();
  };

  const handleMarkRead = async (id: number) => {
    await markRead(id);
    await refreshUnread();
  };

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <header className="family-panel-header flex shrink-0 items-center gap-2 px-4 py-2.5 lg:px-5">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="بازگشت به فید"
            className="family-panel-back"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
            <span>فید</span>
          </button>
        ) : (
          <span className="w-[72px]" aria-hidden />
        )}
        <h2 className="family-panel-title">
          <Bell className="h-4 w-4 text-[var(--family-tg-pinned-accent)]" strokeWidth={1.75} />
          اعلان‌ها
          {unreadCount > 0 && (
            <span className="family-notif-header-badge">{unreadCount.toLocaleString('fa-IR')}</span>
          )}
        </h2>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => void handleMarkAll()}
            className="family-panel-back family-notif-mark-all text-[12px]"
          >
            <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
            همه
          </button>
        ) : (
          <span className="w-[72px]" aria-hidden />
        )}
      </header>

      <div className="family-feed-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="family-notif-panel">
          {isLoading ? (
            <div className="family-notif-list" aria-busy aria-label="در حال بارگذاری اعلان‌ها">
              {Array.from({ length: 6 }, (_, i) => (
                <NotificationSkeleton key={i} index={i} />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <NotificationsEmpty />
          ) : (
            <div className="family-notif-list">
              {notifications.map((notification, index) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  index={index}
                  onRead={handleMarkRead}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
