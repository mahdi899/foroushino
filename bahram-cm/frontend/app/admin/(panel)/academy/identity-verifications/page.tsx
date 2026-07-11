import Link from 'next/link';
import { AdminPage, Badge, StatCard, Table } from '../../ui';
import { getIdentityVerifications } from '@/lib/admin/identityData';
import { IDENTITY_STATUS_LABELS } from '@/lib/admin/identityTypes';
import { formatDate } from '@/lib/admin/academyTypes';

export const dynamic = 'force-dynamic';

function statusTone(status: string): 'default' | 'success' | 'warning' | 'accent' | 'danger' {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'needs_correction') return 'warning';
  if (status === 'submitted' || status === 'under_review') return 'accent';
  return 'default';
}

export default async function IdentityVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; ownership_locked?: string; search?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const { items, meta, stats, error } = await getIdentityVerifications({
    status: sp.status,
    ownership_locked: sp.ownership_locked,
    search: sp.search,
    page: sp.page ? Number(sp.page) : undefined,
  });

  const pending =
    stats?.pending_review ??
    stats?.queue_total ??
    ((stats?.submitted ?? 0) + (stats?.under_review ?? 0));
  const correction = stats?.needs_correction ?? 0;
  const locked = stats?.ownership_locked ?? 0;

  function href(page: number) {
    const q = new URLSearchParams();
    if (sp.status) q.set('status', sp.status);
    if (sp.ownership_locked) q.set('ownership_locked', sp.ownership_locked);
    if (sp.search?.trim()) q.set('search', sp.search.trim());
    if (page > 1) q.set('page', String(page));
    const qs = q.toString();
    return qs ? `/admin/academy/identity-verifications?${qs}` : '/admin/academy/identity-verifications';
  }

  return (
    <AdminPage
      icon="ShieldCheck"
      title="احراز هویت دانشجویان"
      desc="صف و داشبورد بررسی پرونده‌های تأیید هویت"
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="در صف بررسی" value={pending.toLocaleString('fa-IR')} icon="ClipboardList" tone="amber" />
        <StatCard label="نیاز به اصلاح" value={correction.toLocaleString('fa-IR')} icon="Pencil" tone="gold" />
        <StatCard
          label="قفل تطبیق شماره"
          value={locked.toLocaleString('fa-IR')}
          icon="Smartphone"
          tone="teal"
          href="/admin/academy/identity-verifications?ownership_locked=1"
        />
      </div>

      <form className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center" method="get">
        <input
          name="search"
          defaultValue={sp.search}
          placeholder="جستجو نام یا موبایل"
          className="field-input w-full sm:max-w-xs"
        />
        <select name="status" defaultValue={sp.status ?? ''} className="field-input w-full sm:max-w-[12rem]">
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(IDENTITY_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-small text-text">
          <input type="checkbox" name="ownership_locked" value="1" defaultChecked={sp.ownership_locked === '1'} />
          فقط قفل‌شده‌ها
        </label>
        <button type="submit" className="btn btn-secondary">
          فیلتر
        </button>
        {(sp.status || sp.search || sp.ownership_locked) && (
          <Link href="/admin/academy/identity-verifications" className="btn btn-secondary">
            پاک کردن
          </Link>
        )}
      </form>

      {error ? (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{error}</div>
      ) : null}

      {items.length > 0 ? (
        <>
          <Table head={['نام', 'موبایل', 'وضعیت', 'شهر', 'ارسال', 'عملیات']}>
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-surface-soft/40">
                <td className="px-4 py-3 font-medium">
                  {item.first_name} {item.last_name}
                  {item.user_name ? (
                    <span className="mt-0.5 block text-caption text-text-muted">{item.user_name}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3" dir="ltr">
                  {item.user_mobile_masked ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(item.status)}>
                    {IDENTITY_STATUS_LABELS[item.status] ?? item.status}
                  </Badge>
                  {item.ownership_locked ? (
                    <span className="mr-2">
                      <Badge tone="warning">قفل شماره</Badge>
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">{item.city ?? '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-caption">{formatDate(item.submitted_at)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/academy/identity-verifications/${item.id}`}
                    className="font-medium text-accent hover:text-primary"
                  >
                    بررسی
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
          {meta && meta.last_page > 1 ? (
            <div className="mt-4 flex gap-2">
              {meta.current_page > 1 ? (
                <Link href={href(meta.current_page - 1)} className="btn btn-secondary px-3 py-1.5 text-caption">
                  قبلی
                </Link>
              ) : null}
              {meta.current_page < meta.last_page ? (
                <Link href={href(meta.current_page + 1)} className="btn btn-secondary px-3 py-1.5 text-caption">
                  بعدی
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-h3 text-primary-dark">پرونده‌ای در صف نیست</p>
          <p className="mt-2 text-small text-text-muted">با تغییر فیلتر می‌توانید پرونده‌های دیگر را ببینید.</p>
        </div>
      )}
    </AdminPage>
  );
}
