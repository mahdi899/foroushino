import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { AdminPage, StatCard, Table } from '../../../ui';
import { getLandingPageSubmissions } from '@/lib/admin/landingPagesData';
import { LandingSubmissionsExportButtons } from './LandingSubmissionsExportButtons';

export const dynamic = 'force-dynamic';

export default async function LandingPageSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const { items, landingPage, meta, error } = await getLandingPageSubmissions(Number(id), currentPage);
  if (!landingPage) notFound();

  return (
    <AdminPage
      title={`ثبت‌نام‌های «${landingPage.title}»`}
      desc={`تمام افرادی که نام و شماره‌شان را در این صفحه ثبت کرده‌اند — /l/${landingPage.slug}`}
      icon="Inbox"
      headerVariant="leads"
      backHref={`/admin/landing-pages/${landingPage.id}`}
      backLabel="بازگشت به لندینگ"
      action={meta.total > 0 ? <LandingSubmissionsExportButtons landingPageId={landingPage.id} /> : undefined}
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <StatCard label="کل ثبت‌نام‌ها" value={meta.total.toLocaleString('fa-IR')} icon="Inbox" tone="gold" />
        <StatCard
          label="وضعیت صفحه"
          value={landingPage.is_published ? 'منتشرشده' : 'پیش‌نویس'}
          icon="Eye"
          tone={landingPage.is_published ? 'green' : 'teal'}
        />
      </div>

      {error ? <div className="admin-content-list__error">{error}</div> : null}

      <AdminContentPanel
        title="فهرست افراد"
        summary={meta.total > 0 ? <>{meta.total.toLocaleString('fa-IR')} نفر</> : undefined}
      >
        {items.length > 0 ? (
          <>
            <Table
              head={['نام', 'شماره تماس', 'ایمیل', 'توضیحات', 'تاریخ ثبت']}
              mobile={items.map((s) => (
                <AdminTableCard
                  key={s.id}
                  title={s.name || '—'}
                  fields={[
                    { label: 'شماره', value: s.phone || '—', mono: true },
                    ...(s.email ? [{ label: 'ایمیل', value: s.email, mono: true }] : []),
                    ...(s.message ? [{ label: 'توضیحات', value: s.message }] : []),
                    { label: 'تاریخ', value: new Date(s.created_at).toLocaleDateString('fa-IR') },
                  ]}
                />
              ))}
            >
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-surface-soft/40">
                  <td className="px-4 py-3 font-medium text-text">{s.name || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-muted" dir="ltr">
                    {s.phone || '—'}
                  </td>
                  <td className="px-4 py-3 text-text-muted" dir="ltr">
                    {s.email || '—'}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-text-muted">{s.message || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                    {new Date(s.created_at).toLocaleDateString('fa-IR')}
                  </td>
                </tr>
              ))}
            </Table>

            {meta.last_page > 1 ? (
              <div className="mt-4 flex items-center justify-center gap-3">
                <Link
                  href={`/admin/landing-pages/${landingPage.id}/submissions?page=${currentPage - 1}`}
                  aria-disabled={currentPage <= 1}
                  className={`btn btn-secondary px-3 py-1.5 text-caption ${currentPage <= 1 ? 'pointer-events-none opacity-40' : ''}`}
                >
                  <ChevronRight className="h-4 w-4" />
                  قبلی
                </Link>
                <span className="text-caption text-text-muted">
                  صفحه {currentPage.toLocaleString('fa-IR')} از {meta.last_page.toLocaleString('fa-IR')}
                </span>
                <Link
                  href={`/admin/landing-pages/${landingPage.id}/submissions?page=${currentPage + 1}`}
                  aria-disabled={currentPage >= meta.last_page}
                  className={`btn btn-secondary px-3 py-1.5 text-caption ${currentPage >= meta.last_page ? 'pointer-events-none opacity-40' : ''}`}
                >
                  بعدی
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <AdminListEmpty
            icon="Inbox"
            title="هنوز کسی ثبت‌نام نکرده"
            description="وقتی کسی فرم این صفحه را پر کند، نام و شماره‌اش اینجا نمایش داده می‌شود."
          />
        )}
      </AdminContentPanel>
    </AdminPage>
  );
}
