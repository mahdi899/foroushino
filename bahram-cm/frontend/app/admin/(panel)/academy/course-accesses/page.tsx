import Link from 'next/link';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { AdminPage, StatCard, Table } from '../../ui';
import { getSpotplayerLicenses } from '@/lib/admin/academyData';
import { getProducts } from '@/lib/admin/commerceData';
import { formatDateTime } from '@/lib/admin/academyTypes';
import { GrantAccessForm } from './GrantAccessForm';
import { LicenseKeyCopyButton } from './LicenseKeyCopyButton';

export const dynamic = 'force-dynamic';

export default async function CourseAccessesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const sp = await searchParams;
  const [{ items: licenses, meta, error }, { items: products }] = await Promise.all([
    getSpotplayerLicenses({
      page: sp.page ? Number(sp.page) : undefined,
      search: sp.search,
    }),
    getProducts(),
  ]);

  const activeProducts = products.filter((p) => p.is_active).length;
  const hasSearch = Boolean(sp.search?.trim());

  function pageHref(page: number) {
    const query = new URLSearchParams();
    if (sp.search?.trim()) query.set('search', sp.search.trim());
    if (page > 1) query.set('page', String(page));
    const qs = query.toString();
    return qs ? `/admin/academy/course-accesses?${qs}` : '/admin/academy/course-accesses';
  }

  return (
    <AdminPage
      title="دسترسی به دوره‌ها"
      desc="اعطا و مدیریت دسترسی دستی دانشجویان به دوره‌ها"
      icon="KeyRound"
      headerVariant="academy"
    >
      <div className="admin-content-list">
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <StatCard
            label="لایسنس SpotPlayer"
            value={(meta?.total ?? licenses.length).toLocaleString('fa-IR')}
            icon="KeyRound"
            tone="teal"
          />
          <StatCard
            label="محصولات فعال"
            value={activeProducts.toLocaleString('fa-IR')}
            icon="ShoppingBag"
            tone="blue"
          />
          <StatCard
            label="نتیجه جستجو"
            value={licenses.length.toLocaleString('fa-IR')}
            icon="Search"
            tone="gold"
            hint={hasSearch ? 'فیلتر فعال' : 'صفحه جاری'}
          />
        </div>

        <AdminContentPanel title="اعطای دسترسی دستی" className="mb-5">
          <GrantAccessForm products={products} />
        </AdminContentPanel>

        <form className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center" method="get">
          <input
            name="search"
            defaultValue={sp.search}
            placeholder="جستجو با نام، موبایل یا شماره سفارش"
            className="field-input w-full sm:max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn btn-secondary">
              جستجو
            </button>
            {hasSearch ? (
              <Link href="/admin/academy/course-accesses" className="btn btn-secondary">
                پاک کردن
              </Link>
            ) : null}
          </div>
        </form>

        {error ? <div className="admin-content-list__error">{error}</div> : null}

        <AdminContentPanel
          title="لایسنس‌های SpotPlayer"
          summary={meta ? <>{meta.total.toLocaleString('fa-IR')} لایسنس</> : undefined}
        >
          {licenses.length > 0 ? (
            <>
              <Table
                head={['اسم', 'موبایل', 'سفارش', 'تاریخ', 'لایسنس']}
                mobile={licenses.map((license) => (
                  <AdminTableCard
                    key={license.id}
                    title={
                      license.user_id ? (
                        <Link
                          href={`/admin/academy/students/${license.user_id}`}
                          className="font-medium text-primary-dark transition hover:text-accent"
                        >
                          {license.user_name ?? '—'}
                        </Link>
                      ) : (
                        (license.user_name ?? '—')
                      )
                    }
                    fields={[
                      ...(license.product_title
                        ? [{ label: 'محصول', value: license.product_title }]
                        : []),
                      { label: 'موبایل', value: license.user_mobile ?? '—', mono: true },
                      {
                        label: 'سفارش',
                        value:
                          license.order_id && license.order_number ? (
                            <Link
                              href={`/admin/commerce/orders/${license.order_id}`}
                              className="font-mono text-accent transition hover:underline"
                              dir="ltr"
                            >
                              {license.order_number}
                            </Link>
                          ) : (
                            '—'
                          ),
                      },
                      {
                        label: 'تاریخ',
                        value: formatDateTime(license.issued_at ?? license.created_at),
                      },
                      {
                        label: 'لایسنس',
                        value: <LicenseKeyCopyButton licenseKey={license.license_key} />,
                      },
                    ]}
                  />
                ))}
              >
                {licenses.map((license) => (
                  <tr key={license.id} className="hover:bg-surface-soft/40">
                    <td className="px-4 py-3">
                      {license.user_id ? (
                        <Link
                          href={`/admin/academy/students/${license.user_id}`}
                          className="font-medium text-primary-dark transition hover:text-accent"
                        >
                          {license.user_name ?? '—'}
                        </Link>
                      ) : (
                        (license.user_name ?? '—')
                      )}
                      {license.product_title ? (
                        <p className="mt-0.5 text-caption text-text-muted">{license.product_title}</p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-caption" dir="ltr">
                      {license.user_mobile ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {license.order_id && license.order_number ? (
                        <Link
                          href={`/admin/commerce/orders/${license.order_id}`}
                          className="font-mono text-caption text-accent transition hover:underline"
                          dir="ltr"
                        >
                          {license.order_number}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-caption">
                      {formatDateTime(license.issued_at ?? license.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <LicenseKeyCopyButton licenseKey={license.license_key} />
                    </td>
                  </tr>
                ))}
              </Table>

              {meta && meta.last_page > 1 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-caption text-text-muted">
                  <span>
                    صفحه {meta.current_page.toLocaleString('fa-IR')} از {meta.last_page.toLocaleString('fa-IR')}
                  </span>
                  <div className="flex gap-2">
                    {meta.current_page > 1 ? (
                      <Link href={pageHref(meta.current_page - 1)} className="btn btn-secondary px-3 py-1.5 text-caption">
                        قبلی
                      </Link>
                    ) : null}
                    {meta.current_page < meta.last_page ? (
                      <Link href={pageHref(meta.current_page + 1)} className="btn btn-secondary px-3 py-1.5 text-caption">
                        بعدی
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <AdminListEmpty
              icon="KeyRound"
              title={hasSearch ? 'لایسنسی با این جستجو پیدا نشد' : 'هنوز لایسنس SpotPlayer ثبت نشده'}
              description={
                hasSearch
                  ? 'عبارت جستجو را تغییر دهید یا فیلتر را پاک کنید.'
                  : 'پس از پرداخت موفق و تحویل سفارش، لایسنس‌ها اینجا نمایش داده می‌شوند.'
              }
            />
          )}
        </AdminContentPanel>
      </div>
    </AdminPage>
  );
}
