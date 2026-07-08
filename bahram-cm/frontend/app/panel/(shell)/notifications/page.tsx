import type { Metadata } from 'next';
import { Bell, BellOff } from 'lucide-react';
import { NotificationItem, type NotificationEntry } from '@/components/student-panel/notifications/NotificationItem';
import { studentFetch } from '@/lib/student/session';

export const metadata: Metadata = { title: 'اعلان‌ها | پنل کاربری', robots: { index: false, follow: false } };

export default async function PanelNotificationsPage() {
  const { data: notifications } = await studentFetch<{ data: NotificationEntry[] }>('/notifications');

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
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
        <div className="card">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      )}
    </div>
  );
}
