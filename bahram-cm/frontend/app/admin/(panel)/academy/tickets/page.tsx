import { AdminPage, Badge, EditLink, Table } from '../../ui';
import { getTickets } from '@/lib/admin/academyData';
import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS, formatDateTime } from '@/lib/admin/academyTypes';
import { CreateTicketForStudentForm } from './CreateTicketForStudentForm';

export const dynamic = 'force-dynamic';

export default async function TicketsPage() {
  const { items: tickets, error } = await getTickets();

  return (
    <AdminPage title="تیکت‌های پشتیبانی" desc="پاسخ‌گویی به تیکت‌های دانشجویان">
      <CreateTicketForStudentForm defaultOpen={tickets.length === 0} />

      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{error}</div>
      )}

      {tickets.length > 0 ? (
        <Table head={['موضوع', 'دانشجو', 'واحد', 'اولویت', 'وضعیت', 'تاریخ', 'عملیات']}>
          {tickets.map((t) => (
            <tr key={t.id} className="hover:bg-surface-soft/40">
              <td className="px-4 py-3">{t.subject}</td>
              <td className="px-4 py-3">{t.user_name ?? '—'} <span className="text-caption text-text-muted" dir="ltr">{t.user_mobile}</span></td>
              <td className="px-4 py-3 text-caption">{t.department ?? '—'}</td>
              <td className="px-4 py-3"><Badge tone={t.priority === 'high' ? 'danger' : 'default'}>{TICKET_PRIORITY_LABELS[t.priority]}</Badge></td>
              <td className="px-4 py-3"><Badge tone={t.status === 'closed' ? 'default' : t.status === 'open' ? 'warning' : 'success'}>{TICKET_STATUS_LABELS[t.status]}</Badge></td>
              <td className="whitespace-nowrap px-4 py-3 text-caption">{formatDateTime(t.created_at)}</td>
              <td className="px-4 py-3"><EditLink href={`/admin/academy/tickets/${t.id}`} /></td>
            </tr>
          ))}
        </Table>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-h3 text-primary-dark">تیکتی ثبت نشده است</p>
        </div>
      )}
    </AdminPage>
  );
}
