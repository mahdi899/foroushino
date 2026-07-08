'use client';

import Link from 'next/link';
import { Bell, BookOpen, FileText, MessageSquare, Receipt, Sparkles, KeyRound } from 'lucide-react';
import { markNotificationReadAction } from '@/lib/student/panelActions';
import { formatRelativeTimeFa } from '@/components/student-panel/utils/relativeTime';

export interface NotificationEntry {
  id: number;
  title: string;
  body: string;
  type?: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string | null;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function typeIcon(type: string | null | undefined) {
  switch (type) {
    case 'order_paid':
      return Receipt;
    case 'license_ready':
      return KeyRound;
    case 'ticket_created':
    case 'ticket_reply':
      return MessageSquare;
    case 'product_new':
      return Sparkles;
    case 'article_new':
      return FileText;
    case 'welcome':
      return BookOpen;
    default:
      return Bell;
  }
}

function typeLabel(type: string | null | undefined) {
  switch (type) {
    case 'order_paid':
      return 'سفارش';
    case 'license_ready':
      return 'لایسنس';
    case 'ticket_created':
      return 'تیکت';
    case 'ticket_reply':
      return 'پاسخ تیکت';
    case 'product_new':
      return 'محصول جدید';
    case 'article_new':
      return 'مطلب جدید';
    case 'welcome':
      return 'خوش‌آمد';
    default:
      return 'اعلان';
  }
}

export function NotificationItem({ notification }: { notification: NotificationEntry }) {
  const Icon = typeIcon(notification.type);
  const isUnread = !notification.read_at;

  const content = (
    <>
      <span
        className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl sm:h-10 sm:w-10 ${
          isUnread ? 'bg-primary/10 text-primary' : 'bg-surface-soft text-text-muted'
        }`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className={`text-sm font-semibold leading-snug ${isUnread ? 'text-text' : 'text-text-muted'}`}>
            {notification.title}
          </p>
          <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[10px] text-text-muted">
            {typeLabel(notification.type)}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">{notification.body}</p>
        <p className="mt-2 text-[11px] text-text-subtle" title={formatDateTime(notification.created_at)}>
          {formatDateTime(notification.created_at)}
          <span className="mx-1.5 hidden text-border sm:inline">·</span>
          <span className="hidden sm:inline">{formatRelativeTimeFa(notification.created_at)}</span>
        </p>
      </div>
      {isUnread ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
    </>
  );

  const className =
    'flex items-start gap-3 border-b border-border p-3 transition-colors last:border-0 hover:bg-surface-soft/60 sm:p-4';

  const markRead = () => {
    if (isUnread) void markNotificationReadAction(notification.id);
  };

  if (notification.link) {
    return (
      <Link href={notification.link} className={className} onClick={markRead}>
        {content}
      </Link>
    );
  }

  return (
    <div className={className} onClick={markRead}>
      {content}
    </div>
  );
}
