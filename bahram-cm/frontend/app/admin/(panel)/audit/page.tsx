import { getAuditLogs } from '@/lib/admin/data';
import { AdminPage, Table, Badge } from '../ui';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const logs = await getAuditLogs();

  return (
    <AdminPage icon="ClipboardList" headerVariant="settings" title="گزارش فعالیت" desc="تاریخچه تغییرات مدیریتی برای حسابرسی">
      {logs.length ? (
        <Table
          head={['عملیات', 'موجودیت', 'شناسه', 'تاریخ']}
          mobile={logs.map((l) => (
            <AdminTableCard
              key={l.id}
              title={<Badge tone="accent">{l.action}</Badge>}
              fields={[
                { label: 'موجودیت', value: l.entity },
                { label: 'شناسه', value: l.entity_id ?? '—' },
                { label: 'تاریخ', value: new Date(l.created_at).toLocaleString('fa-IR') },
              ]}
            />
          ))}
        >
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="px-4 py-3"><Badge tone="accent">{l.action}</Badge></td>
              <td className="px-4 py-3 text-text">{l.entity}</td>
              <td className="px-4 py-3 text-text-muted">{l.entity_id ?? '—'}</td>
              <td className="px-4 py-3 text-text-muted">{new Date(l.created_at).toLocaleString('fa-IR')}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <div className="card p-8 text-center text-small text-text-muted">
          هنوز فعالیتی ثبت نشده است. تغییرات مدیریتی (مثل ویرایش تنظیمات) در دیتابیس ثبت می‌شوند.
        </div>
      )}
    </AdminPage>
  );
}
