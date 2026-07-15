'use client';

import Link from 'next/link';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { formatRelativeTimeFa } from '@/components/student-panel/utils/relativeTime';
import { useFamilyNotifications, useFamilyUnreadCount } from '@/lib/family/hooks/useFamilyNotifications';
import type { FamilyNotification } from '@/lib/family/types';

function NotificationRow({
  notification,
  onRead,
}: {
  notification: FamilyNotification;
  onRead: (id: number) => void;
}) {
  const isUnread = !notification.read_at;

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border px-4 py-3.5 transition-colors ${
        isUnread
          ? 'border-gold/20 bg-gold/[0.04] hover:border-gold/30 hover:bg-gold/[0.06]'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.035]'
      }`}
    >
      {isUnread && (
        <span
          aria-hidden
          className="absolute top-4 left-4 h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_8px_rgba(201,147,10,0.55)]"
        />
      )}
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isUnread ? 'bg-gold/15 text-gold' : 'bg-white/[0.05] text-bone/45'
          }`}
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1 text-right">
          <div className="flex items-start justify-between gap-2">
            <time className="shrink-0 text-[11px] text-bone/40" dateTime={notification.created_at}>
              {formatRelativeTimeFa(notification.created_at)}
            </time>
            <h4 className={`text-sm leading-snug ${isUnread ? 'font-semibold text-bone' : 'font-medium text-bone/80'}`}>
              {notification.title}
            </h4>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-bone/55">{notification.body}</p>
          {notification.link && (
            <Link
              href={notification.link}
              onClick={() => {
                if (isUnread) onRead(notification.id);
              }}
              className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-medium text-gold/85 transition hover:text-gold"
            >
              {notification.link_label ?? 'مشاهده'}
              <ChevronRight className="h-3.5 w-3.5 rotate-180" strokeWidth={2} />
            </Link>
          )}
          {!notification.link && isUnread && (
            <button
              type="button"
              onClick={() => onRead(notification.id)}
              className="mt-2.5 text-[12px] text-bone/45 transition hover:text-bone/70"
            >
              علامت‌گذاری به‌عنوان خوانده‌شده
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function FamilyNotificationsPanel({
  onClose,
  className,
}: {
  onClose?: () => void;
  className?: string;
}) {
  const { notifications, isLoading, markRead, markAllRead } = useFamilyNotifications(true);
  const { refresh: refreshUnread } = useFamilyUnreadCount(true);
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
    <div className={`flex min-h-0 flex-1 flex-col ${className ?? ''}`}>
      <header className="flex shrink-0 items-center gap-2 border-b border-white/[0.08] bg-[#0c1117]/80 px-4 py-3 backdrop-blur-md lg:px-5">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="بازگشت به فید"
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-bone/65 transition hover:bg-white/[0.05] hover:text-bone"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
            <span className="text-sm font-medium">فید</span>
          </button>
        ) : (
          <span className="w-[72px]" aria-hidden />
        )}
        <h2 className="flex flex-1 items-center justify-center gap-2 text-sm font-semibold text-bone">
          <Bell className="h-4 w-4 text-gold/80" strokeWidth={1.75} />
          اعلان‌ها
          {unreadCount > 0 && (
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-gold">
              {unreadCount.toLocaleString('fa-IR')}
            </span>
          )}
        </h2>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => void handleMarkAll()}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] text-bone/55 transition hover:bg-white/[0.05] hover:text-bone"
          >
            <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
            همه
          </button>
        ) : (
          <span className="w-[72px]" aria-hidden />
        )}
      </header>

      <div className="family-feed-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[680px] px-3 py-4 sm:px-4 lg:px-5 lg:py-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-bone/15 border-t-gold/80" />
              <p className="text-sm text-bone/45">در حال بارگذاری اعلان‌ها…</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-bone/35">
                <Bell className="h-6 w-6" strokeWidth={1.5} />
              </span>
              <p className="text-sm text-bone/50">اعلان جدیدی ندارید</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {notifications.map((notification) => (
                <NotificationRow key={notification.id} notification={notification} onRead={handleMarkRead} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
