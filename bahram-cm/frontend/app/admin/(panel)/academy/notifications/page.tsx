import { AdminPage, Table } from '../../ui';
import { getAudienceSegments, getNotifications } from '@/lib/admin/academyData';
import { formatDateTime } from '@/lib/admin/academyTypes';
import { ComposeNotificationForm } from './ComposeNotificationForm';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const [{ items: notifications, error }, { items: segments }] = await Promise.all([
    getNotifications(),
    getAudienceSegments(),
  ]);

  return (
    <AdminPage title="اعلان‌ها" desc="ارسال اعلان درون‌برنامه‌ای به گروه‌های مختلف دانشجویان">
      <ComposeNotificationForm segments={segments} />

      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{error}</div>
      )}

      {notifications.length > 0 ? (
        <Table head={['عنوان', 'متن', 'تعداد گیرندگان', 'تاریخ ارسال']}>
          {notifications.map((n) => (
            <tr key={n.id} className="hover:bg-surface-soft/40">
              <td className="px-4 py-3">{n.title}</td>
              <td className="max-w-md truncate px-4 py-3 text-caption">{n.body}</td>
              <td className="px-4 py-3">{n.recipients_count}</td>
              <td className="whitespace-nowrap px-4 py-3 text-caption">{formatDateTime(n.created_at)}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-h3 text-primary-dark">هنوز اعلانی ارسال نشده</p>
        </div>
      )}
    </AdminPage>
  );
}
