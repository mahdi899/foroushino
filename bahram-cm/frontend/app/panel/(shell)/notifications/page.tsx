import type { Metadata } from 'next';
import { Bell, BellOff } from 'lucide-react';
import { NotificationItem, type NotificationEntry } from '@/components/student-panel/notifications/NotificationItem';
import { markAllNotificationsReadQuiet, panelStudentFetch } from '@/lib/student/panelServer';

export const metadata: Metadata = { title: 'اعلان‌ها | پنل کاربری', robots: { index: false, follow: false } };

export default async function PanelNotificationsPage() {
  await markAllNotificationsReadQuiet();
  const { data: notifications } = await panelStudentFetch<{ data: NotificationEntry[] }>('/notifications');

  return (
    <div className="panel-page-inner panel-page-inner--sm flex flex-col gap-4 sm:gap-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary sm:h-12 sm:w-12">
          <Bell size={22} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-text">اعلان‌ها</h1>
          <p className="text-sm text-text-muted">پیام‌ها و اطلاع‌رسانی‌های آکادمی</p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <BellOff size={32} className="text-text-muted" />
          <p className="text-sm text-text-muted">اعلانی وجود ندارد.</p>
        </div>
      ) : (
        <div className="card flex flex-col gap-1 p-1">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      )}
    </div>
  );
}
