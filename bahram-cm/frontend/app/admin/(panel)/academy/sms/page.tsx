import { AdminPage, Badge, Table } from '../../ui';
import { getAudienceSegments, getSmsLogs } from '@/lib/admin/academyData';
import { formatDateTime } from '@/lib/admin/academyTypes';
import { SendSmsForm } from './SendSmsForm';

export const dynamic = 'force-dynamic';

export default async function SmsCenterPage() {
  const [{ items: segments }, { items: logs, error }] = await Promise.all([
    getAudienceSegments(),
    getSmsLogs(),
  ]);

  return (
    <AdminPage title="مرکز پیامک" desc="ارسال پیامک هدفمند به گروه‌های دانشجویان و مشاهده لاگ ارسال">
      <SendSmsForm segments={segments} />

      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{error}</div>
      )}

      <h2 className="mb-3 text-h3 font-bold text-primary-dark">لاگ ارسال‌ها</h2>
      {logs.length > 0 ? (
        <Table head={['شماره', 'دانشجو', 'متن', 'ارائه‌دهنده', 'وضعیت', 'تاریخ']}>
          {logs.map((l) => (
            <tr key={l.id} className="hover:bg-surface-soft/40">
              <td className="whitespace-nowrap px-4 py-3" dir="ltr">{l.mobile}</td>
              <td className="px-4 py-3">{l.user_name ?? '—'}</td>
              <td className="max-w-sm truncate px-4 py-3 text-caption">{l.message}</td>
              <td className="px-4 py-3 text-caption">{l.provider ?? '—'}</td>
              <td className="px-4 py-3"><Badge tone={l.status === 'sent' ? 'success' : l.status === 'failed' ? 'danger' : 'default'}>{l.status}</Badge></td>
              <td className="whitespace-nowrap px-4 py-3 text-caption">{formatDateTime(l.created_at)}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <div className="card p-8 text-center text-small text-text-muted">پیامکی ارسال نشده است.</div>
      )}
    </AdminPage>
  );
}
