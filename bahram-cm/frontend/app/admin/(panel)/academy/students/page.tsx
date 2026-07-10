import Link from 'next/link';
import { AdminPage, Badge, EditLink, Table } from '../../ui';
import { getStudents } from '@/lib/admin/academyData';
import { STUDENT_STATUS_LABELS, formatDate, type AdminStudent } from '@/lib/admin/academyTypes';
import { CreateStudentForm } from './CreateStudentForm';
import { StudentsExportButton } from './StudentsExportButton';

export const dynamic = 'force-dynamic';

function statusTone(status: AdminStudent['status']) {
  if (status === 'active') return 'success' as const;
  if (status === 'suspended') return 'warning' as const;
  return 'danger' as const;
}

function StudentMobileCard({ student }: { student: AdminStudent }) {
  return (
    <Link
      href={`/admin/academy/students/${student.id}`}
      className="card block p-4 transition hover:border-accent/40 hover:shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-primary-dark">{student.name}</p>
          <p className="mt-1 text-caption text-text-muted" dir="ltr">
            {student.mobile ?? '—'}
          </p>
        </div>
        <Badge tone={statusTone(student.status)}>{STUDENT_STATUS_LABELS[student.status] ?? student.status}</Badge>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-caption">
        <div>
          <dt className="text-text-muted">سفارش</dt>
          <dd className="mt-0.5 font-medium text-text">{student.orders_count ?? 0}</dd>
        </div>
        <div>
          <dt className="text-text-muted">دوره</dt>
          <dd className="mt-0.5 font-medium text-text">{student.course_accesses_count ?? 0}</dd>
        </div>
        <div>
          <dt className="text-text-muted">اولین ورود</dt>
          <dd className="mt-0.5 font-medium text-text">{formatDate(student.first_login_at)}</dd>
        </div>
      </dl>
    </Link>
  );
}

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

  const hasFilters = Boolean(sp.search?.trim() || sp.status);

  function studentsPageHref(page: number) {
    const query = new URLSearchParams();
    if (sp.search?.trim()) query.set('search', sp.search.trim());
    if (sp.status) query.set('status', sp.status);
    if (page > 1) query.set('page', String(page));
    const qs = query.toString();
    return qs ? `/admin/academy/students?${qs}` : '/admin/academy/students';
  }

  return (
    <AdminPage
      title="دانشجویان"
      desc={
        meta
          ? `${meta.total.toLocaleString('fa-IR')} دانشجو${hasFilters ? ' (فیلترشده)' : ''}`
          : 'مدیریت حساب‌های دانشجویی آکادمی'
      }
    >
      <CreateStudentForm defaultOpen={students.length === 0} />

      <form className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center" method="get">
        <input
          name="search"
          defaultValue={sp.search}
          placeholder="جستجو با نام، موبایل یا ایمیل"
          className="field-input w-full sm:max-w-xs"
        />
        <select name="status" defaultValue={sp.status ?? ''} className="field-input w-full sm:max-w-[10rem]">
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(STUDENT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-secondary flex-1 sm:flex-none">
            فیلتر
          </button>
          {hasFilters && (
            <Link href="/admin/academy/students" className="btn btn-secondary flex-1 sm:flex-none">
              پاک کردن
            </Link>
          )}
          {students.length > 0 ? <StudentsExportButton search={sp.search} status={sp.status} /> : null}
        </div>
      </form>

      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{error}</div>
      )}

      {students.length > 0 ? (
        <>
          <div className="hidden md:block">
            <Table head={['نام', 'موبایل', 'وضعیت', 'سفارش‌ها', 'دوره‌ها', 'اولین ورود', 'عملیات']}>
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-surface-soft/40">
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="whitespace-nowrap px-4 py-3" dir="ltr">
                    {s.mobile ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(s.status)}>{STUDENT_STATUS_LABELS[s.status] ?? s.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{s.orders_count ?? 0}</td>
                  <td className="px-4 py-3">{s.course_accesses_count ?? 0}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-caption">{formatDate(s.first_login_at)}</td>
                  <td className="px-4 py-3">
                    <EditLink href={`/admin/academy/students/${s.id}`} />
                  </td>
                </tr>
              ))}
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {students.map((s) => (
              <StudentMobileCard key={s.id} student={s} />
            ))}
          </div>

          {meta && meta.last_page > 1 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-caption text-text-muted">
              <span>
                صفحه {meta.current_page.toLocaleString('fa-IR')} از {meta.last_page.toLocaleString('fa-IR')} — نمایش{' '}
                {students.length.toLocaleString('fa-IR')} از {meta.total.toLocaleString('fa-IR')} دانشجو
              </span>
              <div className="flex gap-2">
                {meta.current_page > 1 ? (
                  <Link href={studentsPageHref(meta.current_page - 1)} className="btn btn-secondary px-3 py-1.5 text-caption">
                    قبلی
                  </Link>
                ) : null}
                {meta.current_page < meta.last_page ? (
                  <Link href={studentsPageHref(meta.current_page + 1)} className="btn btn-secondary px-3 py-1.5 text-caption">
                    بعدی
                  </Link>
                ) : null}
              </div>
            </div>
          ) : meta && meta.total > 0 ? (
            <p className="mt-3 text-caption text-text-muted">
              {meta.total.toLocaleString('fa-IR')} دانشجو
            </p>
          ) : null}
        </>
      ) : (
        <div className="card p-8 text-center sm:p-10">
          <p className="text-h3 text-primary-dark">
            {hasFilters ? 'دانشجویی با این فیلتر پیدا نشد' : 'هنوز دانشجویی ثبت نشده'}
          </p>
          <p className="mt-2 text-small text-text-muted">
            {hasFilters
              ? 'فیلتر را تغییر دهید یا فرم بالا را برای ثبت دانشجوی جدید پر کنید.'
              : 'با فرم بالا اولین دانشجو را ثبت کنید یا از بخش Import وارد کنید.'}
          </p>
          {!hasFilters && (
            <Link href="/admin/academy/imports" className="btn btn-secondary mt-4 inline-flex">
              ورود دسته‌ای (Import)
            </Link>
          )}
        </div>
      )}
    </AdminPage>
  );
}
