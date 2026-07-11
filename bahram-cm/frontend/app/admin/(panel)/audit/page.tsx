import Link from 'next/link';
import { AdminPage, Badge, Table } from '../ui';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { getAdminAuditLogs } from '@/lib/admin/accessData';

export const dynamic = 'force-dynamic';

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const { items: logs, meta, error } = await getAdminAuditLogs({
    action: sp.action,
    page: sp.page ? Number(sp.page) : undefined,
  });

  return (
    <AdminPage icon="ClipboardList" headerVariant="settings" title="گزارش فعالیت" desc="تاریخچه تغییرات مدیریتی برای حسابرسی">
      <form className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center" method="get">
        <input
          name="action"
          defaultValue={sp.action}
          placeholder="فیلتر عملیات (مثلاً student.mobile_revealed)"
          className="field-input w-full sm:max-w-sm"
          dir="ltr"
        />
        <button type="submit" className="btn btn-secondary">
          فیلتر
        </button>
        {sp.action ? (
          <Link href="/admin/audit" className="btn btn-secondary">
            پاک کردن
          </Link>
        ) : null}
      </form>

      {error ? (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{error}</div>
      ) : null}

      {logs.length ? (
        <>
          <Table
            head={['عملیات', 'عامل', 'موجودیت', 'شناسه', 'تاریخ']}
            mobile={logs.map((l) => (
              <AdminTableCard
                key={l.id}
                title={<Badge tone="accent">{l.action}</Badge>}
                fields={[
                  { label: 'عامل', value: l.actor_name ?? l.actor_email ?? '—' },
                  { label: 'موجودیت', value: l.subject_type ?? '—' },
                  { label: 'شناسه', value: l.subject_id ?? '—' },
                  { label: 'تاریخ', value: new Date(l.created_at).toLocaleString('fa-IR') },
                ]}
              />
            ))}
          >
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3">
                  <Badge tone="accent">{l.action}</Badge>
                </td>
                <td className="px-4 py-3 text-text">{l.actor_name ?? l.actor_email ?? '—'}</td>
                <td className="px-4 py-3 text-text-muted">{l.subject_type ?? '—'}</td>
                <td className="px-4 py-3 text-text-muted">{l.subject_id ?? '—'}</td>
                <td className="px-4 py-3 text-text-muted">{new Date(l.created_at).toLocaleString('fa-IR')}</td>
              </tr>
            ))}
          </Table>
          {meta && meta.last_page > 1 ? (
            <div className="mt-4 flex gap-2 text-caption">
              {meta.current_page > 1 ? (
                <Link
                  href={`/admin/audit?page=${meta.current_page - 1}${sp.action ? `&action=${encodeURIComponent(sp.action)}` : ''}`}
                  className="btn btn-secondary px-3 py-1.5"
                >
                  قبلی
                </Link>
              ) : null}
              {meta.current_page < meta.last_page ? (
                <Link
                  href={`/admin/audit?page=${meta.current_page + 1}${sp.action ? `&action=${encodeURIComponent(sp.action)}` : ''}`}
                  className="btn btn-secondary px-3 py-1.5"
                >
                  بعدی
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <div className="card p-8 text-center text-small text-text-muted">
          هنوز فعالیتی ثبت نشده است. تغییرات مدیریتی (مثل Reveal یا تغییر نقش) در اینجا نمایش داده می‌شوند.
        </div>
      )}
    </AdminPage>
  );
}
