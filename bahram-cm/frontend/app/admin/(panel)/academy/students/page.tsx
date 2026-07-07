import { AdminPage, Badge, EditLink, Table } from '../../ui';
import { getStudents } from '@/lib/admin/academyData';
import { STUDENT_STATUS_LABELS, formatDate } from '@/lib/admin/academyTypes';

export const dynamic = 'force-dynamic';

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const { items: students, meta, error } = await getStudents({
    search: sp.search,
    status: sp.status,
    page: sp.page ? Number(sp.page) : undefined,
  });

  return (
    <AdminPage title="دانشجویان" desc="مدیریت حساب‌های دانشجویی آکادمی">
      <form className="mb-4 flex flex-wrap gap-3" method="get">
        <input
          name="search"
          defaultValue={sp.search}
          placeholder="جستجو با نام، موبایل یا ایمیل"
          className="field-input max-w-xs"
        />
        <select name="status" defaultValue={sp.status ?? ''} className="field-input max-w-[10rem]">
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(STUDENT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-secondary">فیلتر</button>
      </form>

      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{error}</div>
      )}

      {students.length > 0 ? (
        <>
          <Table head={['نام', 'موبایل', 'وضعیت', 'سفارش‌ها', 'دوره‌ها', 'اولین ورود', 'عملیات']}>
            {students.map((s) => (
              <tr key={s.id} className="hover:bg-surface-soft/40">
                <td className="px-4 py-3">{s.name}</td>
                <td className="whitespace-nowrap px-4 py-3" dir="ltr">{s.mobile ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge tone={s.status === 'active' ? 'success' : s.status === 'suspended' ? 'warning' : 'danger'}>
                    {STUDENT_STATUS_LABELS[s.status] ?? s.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">{s.orders_count ?? 0}</td>
                <td className="px-4 py-3">{s.course_accesses_count ?? 0}</td>
                <td className="whitespace-nowrap px-4 py-3 text-caption">{formatDate(s.first_login_at)}</td>
                <td className="px-4 py-3"><EditLink href={`/admin/academy/students/${s.id}`} /></td>
              </tr>
            ))}
          </Table>
          {meta && meta.last_page > 1 && (
            <p className="mt-3 text-caption text-text-muted">صفحه {meta.current_page} از {meta.last_page} — مجموع {meta.total} دانشجو</p>
          )}
        </>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-h3 text-primary-dark">هنوز دانشجویی ثبت نشده</p>
        </div>
      )}
    </AdminPage>
  );
}
