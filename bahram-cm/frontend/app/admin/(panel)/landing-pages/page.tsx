import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { AdminPage, Badge, EditLink, StatCard, Table } from '../ui';
import { getLandingPages } from '@/lib/admin/landingPagesData';

export const dynamic = 'force-dynamic';

export default async function LandingPagesPage() {
  const { items: pages, error } = await getLandingPages();
  const publishedCount = pages.filter((p) => p.is_published).length;
  const totalSubmissions = pages.reduce((sum, p) => sum + p.leads_count, 0);

  return (
    <AdminPage
      title="لندینگ ثبت‌شماره"
      desc="صفحات لندینگ برای جمع‌آوری نام و شماره از مخاطبان — هر صفحه ردیابی جدا دارد"
      icon="LayoutTemplate"
      headerVariant="leads"
      action={
        <Link href="/admin/landing-pages/new" className="btn btn-primary">
          <Plus className="h-4 w-4" /> لندینگ جدید
        </Link>
      }
    >
      <div className="admin-content-list">
        {pages.length > 0 ? (
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <StatCard label="کل صفحات" value={pages.length.toLocaleString('fa-IR')} icon="LayoutTemplate" tone="teal" />
            <StatCard label="منتشرشده" value={publishedCount.toLocaleString('fa-IR')} icon="Eye" tone="green" />
            <StatCard
              label="کل ثبت‌نام‌ها"
              value={totalSubmissions.toLocaleString('fa-IR')}
              icon="Inbox"
              tone="gold"
            />
          </div>
        ) : null}

        {error ? <div className="admin-content-list__error">{error}</div> : null}

        <AdminContentPanel
          title="فهرست لندینگ‌ها"
          summary={
            pages.length > 0 ? (
              <>
                {pages.length.toLocaleString('fa-IR')} صفحه · {publishedCount.toLocaleString('fa-IR')} منتشرشده
              </>
            ) : undefined
          }
        >
          {pages.length > 0 ? (
            <Table
              head={['عنوان', 'آدرس', 'ثبت‌نام‌ها', 'وضعیت', 'عملیات']}
              mobile={pages.map((p) => (
                <AdminTableCard
                  key={p.id}
                  title={p.title}
                  fields={[
                    { label: 'آدرس', value: `/l/${p.slug}`, mono: true },
                    { label: 'ثبت‌نام‌ها', value: p.leads_count.toLocaleString('fa-IR') },
                    {
                      label: 'وضعیت',
                      value: (
                        <Badge tone={p.is_published ? 'success' : 'default'}>
                          {p.is_published ? 'منتشرشده' : 'پیش‌نویس'}
                        </Badge>
                      ),
                    },
                  ]}
                  footer={
                    <div className="flex w-full items-center justify-between gap-2">
                      <Link
                        href={`/admin/landing-pages/${p.id}/submissions`}
                        className="text-accent hover:text-primary"
                      >
                        مشاهده ثبت‌نام‌ها
                      </Link>
                      <EditLink href={`/admin/landing-pages/${p.id}`} />
                    </div>
                  }
                />
              ))}
            >
              {pages.map((p) => (
                <tr key={p.id} className="hover:bg-surface-soft/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text">{p.title}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-muted" dir="ltr">
                    /l/{p.slug}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/landing-pages/${p.id}/submissions`}
                      className="font-medium text-accent hover:text-primary"
                    >
                      {p.leads_count.toLocaleString('fa-IR')} نفر
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={p.is_published ? 'success' : 'default'}>
                      {p.is_published ? 'منتشرشده' : 'پیش‌نویس'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <EditLink href={`/admin/landing-pages/${p.id}`} />
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <AdminListEmpty
              icon="LayoutTemplate"
              title="هنوز لندینگی ساخته نشده"
              description="یک صفحه لندینگ بساز تا لینکش را در کمپین‌ها به اشتراک بگذاری و شماره‌ها را جمع‌آوری کنی."
              action={
                <Link href="/admin/landing-pages/new" className="btn btn-primary">
                  <Plus className="h-4 w-4" />
                  افزودن لندینگ
                </Link>
              }
            />
          )}
        </AdminContentPanel>
      </div>
    </AdminPage>
  );
}
