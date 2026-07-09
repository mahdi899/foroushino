'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { markNotificationReadAction } from '@/lib/student/panelActions';
import { formatRelativeTimeFa } from '@/components/student-panel/utils/relativeTime';
import {
  notificationTypeIcon,
  notificationTypeLabel,
  notificationTypeVariant,
} from '@/components/student-panel/notifications/notificationMeta';

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

export function NotificationItem({ notification }: { notification: NotificationEntry }) {
  const Icon = notificationTypeIcon(notification.type);
  const isUnread = !notification.read_at;
  const typeVariant = notificationTypeVariant(notification.type);

  const content = (
    <article
      className={`panel-notification ${isUnread ? 'panel-notification--unread' : 'panel-notification--read'}`}
    >
      <header className="panel-notification__header">
        <div className="panel-notification__lead">
          <span className={`panel-notification__icon panel-notification__icon--${typeVariant}`}>
            <Icon size={17} />
          </span>
          <span className={`panel-notification__chip panel-notification__chip--${typeVariant}`}>
            {notificationTypeLabel(notification.type)}
          </span>
        </div>
        <time className="panel-notification__time" dateTime={notification.created_at ?? undefined} title={formatDateTime(notification.created_at)}>
          {formatRelativeTimeFa(notification.created_at)}
        </time>
      </header>

      <div className="panel-notification__body">
        <h3 className="panel-notification__title">{notification.title}</h3>
        <p className="panel-notification__text">{notification.body}</p>
      </div>

      <footer className="panel-notification__footer">
        <span className="panel-notification__datetime">{formatDateTime(notification.created_at)}</span>
        {notification.link ? (
          <span className="panel-notification__action">
            مشاهده
            <ChevronLeft className="h-3.5 w-3.5" />
          </span>
        ) : null}
        {isUnread ? <span className="panel-notification__dot" aria-hidden /> : null}
      </footer>
    </article>
  );

  const markRead = () => {
    if (isUnread) void markNotificationReadAction(notification.id);
  };

  if (notification.link) {
    return (
      <Link href={notification.link} className="panel-notification-link" onClick={markRead}>
        {content}
      </Link>
    );
  }

  return (
    <div className="panel-notification-link" onClick={markRead} role="button" tabIndex={0}>
      {content}
    </div>
  );
}
