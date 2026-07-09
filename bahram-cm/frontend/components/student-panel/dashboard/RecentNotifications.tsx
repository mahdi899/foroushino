import Link from 'next/link';
import { Bell, ChevronLeft } from 'lucide-react';
import type { NotificationEntry } from '@/components/student-panel/notifications/NotificationItem';
import { formatRelativeTimeFa } from '@/components/student-panel/utils/relativeTime';
import {
  notificationTypeIcon,
  notificationTypeLabel,
  notificationTypeVariant,
} from '@/components/student-panel/notifications/notificationMeta';

export function RecentNotifications({ notifications }: { notifications: NotificationEntry[] }) {
  return (
    <section className="card panel-notifications-section p-5 text-right sm:p-6">
      <div className="panel-notifications-section__header mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-text">
          <span className="panel-notifications-section__icon">
            <Bell size={16} strokeWidth={2} />
          </span>
          اعلان‌های اخیر
        </h2>
        <Link href="/panel/notifications" className="panel-notifications-section__link panel-text-caption inline-flex items-center gap-1 font-semibold transition">
          مشاهده همه
          <ChevronLeft className="h-3.5 w-3.5" />
        </Link>
      </div>

      {notifications.length === 0 ? (
        <p className="panel-notifications-section__empty py-6 text-center text-sm text-text-muted">اعلانی وجود ندارد.</p>
      ) : (
        <ul className="panel-notifications-section__list flex flex-col gap-3">
          {notifications.map((notification) => {
            const Icon = notificationTypeIcon(notification.type);
            const typeVariant = notificationTypeVariant(notification.type);
            const isUnread = !notification.read_at;

            const inner = (
              <article className={`panel-notification panel-notification--compact ${isUnread ? 'panel-notification--unread' : 'panel-notification--read'}`}>
                <header className="panel-notification__header">
                  <div className="panel-notification__lead">
                    <span className={`panel-notification__icon panel-notification__icon--${typeVariant}`}>
                      <Icon size={15} />
                    </span>
                    <span className={`panel-notification__chip panel-notification__chip--${typeVariant}`}>
                      {notificationTypeLabel(notification.type)}
                    </span>
                  </div>
                  <time className="panel-notification__time" dateTime={notification.created_at ?? undefined}>
                    {formatRelativeTimeFa(notification.created_at)}
                  </time>
                </header>
                <h3 className="panel-notification__title">{notification.title}</h3>
                <p className="panel-notification__text">{notification.body}</p>
              </article>
            );

            return (
              <li key={notification.id} className="panel-notification-card">
                {notification.link ? (
                  <Link href={notification.link} className="panel-notification-link">
                    {inner}
                  </Link>
                ) : (
                  <div className="panel-notification-link">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
