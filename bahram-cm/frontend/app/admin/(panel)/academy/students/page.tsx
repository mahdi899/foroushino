import Link from 'next/link';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { AdminPage, Badge, EditLink, StatCard, Table } from '../../ui';
import { getStudents } from '@/lib/admin/academyData';
import { STUDENT_STATUS_LABELS, formatDate, type AdminStudent } from '@/lib/admin/academyTypes';
import { cn } from '@/lib/utils';
import { CreateStudentForm } from './CreateStudentForm';
import { StudentsExportButton } from './StudentsExportButton';
import { RevealMobileButton } from './RevealMobileButton';

export const dynamic = 'force-dynamic';

function statusTone(status: AdminStudent['status']) {
  if (status === 'active') return 'success' as const;
  if (status === 'suspended') return 'warning' as const;
  return 'danger' as const;
}

function maskedMobile(student: AdminStudent) {
  return student.mobile_masked ?? student.mobile ?? null;
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
      desc="مدیریت حساب‌های دانشجویی آکادمی"
      icon="Users"
      headerVariant="academy"
    >
      <div className="admin-content-list">
        {meta ? (
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <StatCard
              label="کل دانشجویان"
              value={meta.total.toLocaleString('fa-IR')}
              icon="Users"
              tone="teal"
            />
            <StatCard
              label="نتیجه جستجو"
              value={students.length.toLocaleString('fa-IR')}
              icon="Search"
              tone="blue"
              hint={hasFilters ? 'فیلتر فعال' : 'صفحه جاری'}
            />
            <StatCard
              label="ورود دسته‌ای"
              value="گروهی"
              icon="FileUp"
              tone="gold"
              href="/admin/academy/imports"
              hint="CSV / Excel"
            />
          </div>
        ) : null}

        <AdminContentPanel title="ثبت دانشجوی جدید" className="mb-5">
          <CreateStudentForm defaultOpen={students.length === 0} />
        </AdminContentPanel>

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

        {error ? <div className="admin-content-list__error">{error}</div> : null}

        <AdminContentPanel
          title="فهرست دانشجویان"
          summary={
            meta ? (
              <>
                {meta.total.toLocaleString('fa-IR')} دانشجو
                {hasFilters ? ' (فیلترشده)' : ''}
              </>
            ) : undefined
          }
        >
          {students.length > 0 ? (
            <>
              <Table
                head={['نام', 'موبایل', 'وضعیت', 'سفارش‌ها', 'دوره‌ها', 'اولین ورود', 'عملیات']}
                mobile={students.map((s) => {
                  const blocked = s.status === 'blocked';
                  return (
                    <AdminTableCard
                      key={s.id}
                      title={
                        <Link
                          href={`/admin/academy/students/${s.id}`}
                          className={cn('font-semibold hover:text-accent', blocked && 'text-error')}
                        >
                          {s.name}
                        </Link>
                      }
                      fields={[
                        {
                          label: 'موبایل',
                          value: maskedMobile(s) ?? '—',
                          mono: true,
                        },
                        {
                          label: 'وضعیت',
                          value: (
                            <Badge tone={statusTone(s.status)}>{STUDENT_STATUS_LABELS[s.status] ?? s.status}</Badge>
                          ),
                        },
                        { label: 'سفارش', value: s.orders_count ?? 0 },
                        { label: 'دوره', value: s.course_accesses_count ?? 0 },
                        { label: 'اولین ورود', value: formatDate(s.first_login_at) },
                      ]}
                      footer={<EditLink href={`/admin/academy/students/${s.id}`} />}
                      className={blocked ? 'border-error/30 bg-error/5' : undefined}
                    />
                  );
                })}
              >
                {students.map((s) => {
                  const blocked = s.status === 'blocked';
                  return (
                    <tr key={s.id} className={cn('hover:bg-surface-soft/40', blocked && 'bg-error/5')}>
                      <td className={cn('px-4 py-3', blocked && 'font-semibold text-error')}>{s.name}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <RevealMobileButton
                          studentId={s.id}
                          masked={maskedMobile(s)}
                          canReveal={s.can_reveal_mobile}
                        />
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
                  );
                })}
              </Table>

              {meta && meta.last_page > 1 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-caption text-text-muted">
                  <span>
                    صفحه {meta.current_page.toLocaleString('fa-IR')} از {meta.last_page.toLocaleString('fa-IR')} — نمایش{' '}
                    {students.length.toLocaleString('fa-IR')} از {meta.total.toLocaleString('fa-IR')} دانشجو
                  </span>
                  <div className="flex gap-2">
                    {meta.current_page > 1 ? (
                      <Link
                        href={studentsPageHref(meta.current_page - 1)}
                        className="btn btn-secondary px-3 py-1.5 text-caption"
                      >
                        قبلی
                      </Link>
                    ) : null}
                    {meta.current_page < meta.last_page ? (
                      <Link
                        href={studentsPageHref(meta.current_page + 1)}
                        className="btn btn-secondary px-3 py-1.5 text-caption"
                      >
                        بعدی
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : meta && meta.total > 0 ? (
                <p className="mt-3 text-caption text-text-muted">{meta.total.toLocaleString('fa-IR')} دانشجو</p>
              ) : null}
            </>
          ) : (
            <AdminListEmpty
              icon="Users"
              title={hasFilters ? 'دانشجویی با این فیلتر پیدا نشد' : 'هنوز دانشجویی ثبت نشده'}
              description={
                hasFilters
                  ? 'فیلتر را تغییر دهید یا فرم بالا را برای ثبت دانشجوی جدید پر کنید.'
                  : 'با فرم بالا اولین دانشجو را ثبت کنید یا از بخش Import وارد کنید.'
              }
              action={
                !hasFilters ? (
                  <Link href="/admin/academy/imports" className="btn btn-secondary">
                    ورود دسته‌ای (Import)
                  </Link>
                ) : undefined
              }
            />
          )}
        </AdminContentPanel>
      </div>
    </AdminPage>
  );
}
