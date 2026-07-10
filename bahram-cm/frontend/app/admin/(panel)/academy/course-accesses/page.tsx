import Link from 'next/link';
import { AdminPage, Table } from '../../ui';
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

  return (
    <AdminPage title="دسترسی به دوره‌ها" desc="اعطا و مدیریت دسترسی دستی دانشجویان به دوره‌ها">
      <GrantAccessForm products={products} />

      <div className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-h3 font-bold text-primary-dark">لایسنس‌های SpotPlayer</h2>
          {meta ? (
            <span className="text-caption text-text-muted">
              {meta.total.toLocaleString('fa-IR')} لایسنس
            </span>
          ) : null}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">
            {error}
          </div>
        )}

        {licenses.length > 0 ? (
          <>
            <Table head={['اسم', 'موبایل', 'سفارش', 'تاریخ', 'لایسنس']}>
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

            {meta && meta.last_page > 1 && (
              <p className="mt-3 text-caption text-text-muted">
                صفحه {meta.current_page.toLocaleString('fa-IR')} از {meta.last_page.toLocaleString('fa-IR')}
              </p>
            )}
          </>
        ) : (
          <div className="card p-10 text-center">
            <p className="text-h3 text-primary-dark">هنوز لایسنس SpotPlayer ثبت نشده</p>
            <p className="mt-2 text-small text-text-muted">
              پس از پرداخت موفق و تحویل سفارش، لایسنس‌ها اینجا نمایش داده می‌شوند.
            </p>
          </div>
        )}
      </div>
    </AdminPage>
  );
}
