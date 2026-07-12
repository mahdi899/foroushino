'use client';

import { markNotificationReadAction } from '@/lib/student/panelActions';
import { formatRelativeTimeFa } from '@/components/student-panel/utils/relativeTime';
import { isOrderPaidNotification } from '@/components/student-panel/notifications/notificationPremium';
import {
  notificationTypeIcon,
  notificationTypeLabel,
  notificationTypeVariant,
} from '@/components/student-panel/notifications/notificationMeta';
import { NotificationLinkButton } from '@/components/student-panel/notifications/NotificationLinkButton';

export interface NotificationEntry {
  id: number;
  title: string;
  body: string;
  type?: string | null;
  link: string | null;
  link_label?: string | null;
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
  const isPremium = isOrderPaidNotification(notification.type);
  const hasLink = Boolean(notification.link?.trim());

  const cardClass = [
    'panel-notification-link',
    isPremium ? 'panel-notification-link--premium' : '',
    hasLink ? '' : 'panel-notification-link--static',
  ]
    .filter(Boolean)
    .join(' ');

  const markRead = () => {
    if (isUnread) void markNotificationReadAction(notification.id);
  };

  return (
    <article
      className={`${cardClass} panel-notification ${isUnread ? 'panel-notification--unread' : 'panel-notification--read'}`}
      onClick={markRead}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          markRead();
        }
      }}
      role="button"
      tabIndex={0}
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
        <time
          className="panel-notification__time"
          dateTime={notification.created_at ?? undefined}
          title={formatDateTime(notification.created_at)}
        >
          {formatRelativeTimeFa(notification.created_at)}
        </time>
      </header>

      <div className="panel-notification__body">
        <h3 className="panel-notification__title">{notification.title}</h3>
        <p className="panel-notification__text">{notification.body}</p>
      </div>

      <footer className="panel-notification__footer">
        <span className="panel-notification__datetime">{formatDateTime(notification.created_at)}</span>
        <div className="panel-notification__footer-actions">
          {hasLink && notification.link ? (
            <span onClick={(event) => event.stopPropagation()}>
              <NotificationLinkButton
                link={notification.link}
                linkLabel={notification.link_label}
                onNavigate={markRead}
              />
            </span>
          ) : null}
          {isUnread ? <span className="panel-notification__dot" aria-hidden /> : null}
        </div>
      </footer>
    </article>
  );
}
