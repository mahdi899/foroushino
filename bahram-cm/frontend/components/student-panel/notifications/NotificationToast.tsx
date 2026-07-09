'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { markNotificationReadAction } from '@/lib/student/panelActions';
import type { PanelNotificationPayload } from '@/lib/student/panelActions';
import { formatRelativeTimeFa } from '@/components/student-panel/utils/relativeTime';
import {
  notificationTypeIcon,
  notificationTypeLabel,
  notificationTypeVariant,
} from '@/components/student-panel/notifications/notificationMeta';

const AUTO_DISMISS_MS = 8_000;

export function NotificationToast({
  notification,
  onDismiss,
}: {
  notification: PanelNotificationPayload;
  onDismiss: (id: number) => void;
}) {
  const router = useRouter();
  const Icon = notificationTypeIcon(notification.type);
  const typeVariant = notificationTypeVariant(notification.type);

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(notification.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [notification.id, onDismiss]);

  async function openNotification() {
    if (!notification.read_at) {
      await markNotificationReadAction(notification.id);
    }
    onDismiss(notification.id);
    if (notification.link) {
      router.push(notification.link);
    }
  }

  const content = (
    <article className="panel-notification panel-notification--compact panel-notification--unread">
      <header className="panel-notification__header">
        <div className="panel-notification__lead">
          <span className={`panel-notification__icon panel-notification__icon--${typeVariant}`}>
            <Icon size={16} />
          </span>
          <span className={`panel-notification__chip panel-notification__chip--${typeVariant}`}>
            {notificationTypeLabel(notification.type)}
          </span>
        </div>
        <time className="panel-notification__time" dateTime={notification.created_at ?? undefined}>
          {formatRelativeTimeFa(notification.created_at)}
        </time>
      </header>

      <div className="panel-notification__body">
        <h3 className="panel-notification__title">{notification.title}</h3>
        <p className="panel-notification__text">{notification.body}</p>
      </div>

      {notification.link ? (
        <footer className="panel-notification__footer">
          <span className="panel-notification__action">مشاهده</span>
          <span className="panel-notification__dot" aria-hidden />
        </footer>
      ) : null}
    </article>
  );

  return (
    <div className="panel-notification-toast" role="alert" aria-live="polite">
      {notification.link ? (
        <Link
          href={notification.link}
          className="panel-notification-toast__card"
          onClick={(e) => {
            e.preventDefault();
            void openNotification();
          }}
        >
          {content}
        </Link>
      ) : (
        <button type="button" className="panel-notification-toast__card" onClick={() => void openNotification()}>
          {content}
        </button>
      )}
      <button
        type="button"
        className="panel-notification-toast__close"
        aria-label="بستن اعلان"
        onClick={() => onDismiss(notification.id)}
      >
        <X size={16} />
      </button>
    </div>
  );
}
