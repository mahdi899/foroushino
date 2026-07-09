import type { Metadata } from 'next';
import { Bell, BellOff } from 'lucide-react';
import { PanelPageHeader } from '@/components/student-panel/layout/PanelPageHeader';
import { NotificationItem, type NotificationEntry } from '@/components/student-panel/notifications/NotificationItem';
import { markAllNotificationsReadQuiet, panelStudentFetch } from '@/lib/student/panelServer';

export const metadata: Metadata = { title: 'اعلان‌ها | پنل کاربری', robots: { index: false, follow: false } };

export default async function PanelNotificationsPage() {
  await markAllNotificationsReadQuiet();
  const { data: notifications } = await panelStudentFetch<{ data: NotificationEntry[] }>('/notifications');

  return (
    <div className="panel-page-inner flex flex-col gap-4 sm:gap-5">
      <PanelPageHeader
        icon={Bell}
        title="اعلان‌ها"
        description="پیام‌ها و اطلاع‌رسانی‌های آکادمی"
      />

      {notifications.length === 0 ? (
        <div className="panel-empty-state card flex flex-col items-center gap-3 p-10 text-center">
          <BellOff size={32} className="text-text-muted" />
          <p className="text-sm text-text-muted">اعلانی وجود ندارد.</p>
        </div>
      ) : (
        <ul className="panel-notification-list">
          {notifications.map((notification) => (
            <li key={notification.id} className="panel-notification-card">
              <NotificationItem notification={notification} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
