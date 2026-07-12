'use client';

import { useEffect } from 'react';
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
import { NotificationLinkButton } from '@/components/student-panel/notifications/NotificationLinkButton';
import { isExternalNotificationLink } from '@/components/student-panel/notifications/notificationLink';

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
  const hasLink = Boolean(notification.link?.trim());

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(notification.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [notification.id, onDismiss]);

  async function markRead() {
    if (!notification.read_at) {
      await markNotificationReadAction(notification.id);
    }
  }

  async function dismissToast() {
    await markRead();
    onDismiss(notification.id);
  }

  async function openNotificationLink() {
    if (!notification.link) {
      return;
    }

    await markRead();
    onDismiss(notification.id);

    if (isExternalNotificationLink(notification.link)) {
      window.open(notification.link, '_blank', 'noopener,noreferrer');
      return;
    }

    router.push(notification.link);
  }

  return (
    <div className="panel-notification-toast" role="alert" aria-live="polite">
      <div className="panel-notification-toast__card">
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

          {hasLink && notification.link ? (
            <footer className="panel-notification__footer panel-notification__footer--cta">
              <NotificationLinkButton
                link={notification.link}
                linkLabel={notification.link_label}
                variant="compact"
                onNavigate={(event) => {
                  event.preventDefault();
                  void openNotificationLink();
                }}
              />
            </footer>
          ) : null}
        </article>
      </div>
      <button
        type="button"
        className="panel-notification-toast__close"
        aria-label="بستن اعلان"
        onClick={() => void dismissToast()}
      >
        <X size={16} />
      </button>
    </div>
  );
}
