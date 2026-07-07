import { AdminPage, Table } from '../../ui';
import { getCourseAccesses } from '@/lib/admin/academyData';
import { formatDate } from '@/lib/admin/academyTypes';
import { GrantAccessForm } from './GrantAccessForm';
import { AccessStatusSelect } from './AccessStatusSelect';

export const dynamic = 'force-dynamic';

export default async function CourseAccessesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const { items: accesses, meta, error } = await getCourseAccesses({ page: sp.page ? Number(sp.page) : undefined });

  return (
    <AdminPage title="دسترسی به دوره‌ها" desc="اعطا و مدیریت دسترسی دستی دانشجویان به دوره‌ها">
      <GrantAccessForm />

      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{error}</div>
      )}

      {accesses.length > 0 ? (
        <>
          <Table head={['دانشجو', 'موبایل', 'محصول', 'منبع', 'وضعیت', 'تاریخ فعال‌سازی']}>
            {accesses.map((a) => (
              <tr key={a.id} className="hover:bg-surface-soft/40">
                <td className="px-4 py-3">{a.user_name ?? '—'}</td>
                <td className="whitespace-nowrap px-4 py-3" dir="ltr">{a.user_mobile ?? '—'}</td>
                <td className="px-4 py-3">{a.product_title ?? '—'}</td>
                <td className="px-4 py-3 text-caption">{a.source}</td>
                <td className="px-4 py-3"><AccessStatusSelect accessId={a.id} initialStatus={a.status} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-caption">{formatDate(a.activated_at)}</td>
              </tr>
            ))}
          </Table>
          {meta && meta.last_page > 1 && (
            <p className="mt-3 text-caption text-text-muted">صفحه {meta.current_page} از {meta.last_page} — مجموع {meta.total} دسترسی</p>
          )}
        </>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-h3 text-primary-dark">هنوز دسترسی‌ای ثبت نشده</p>
        </div>
      )}
    </AdminPage>
  );
}
