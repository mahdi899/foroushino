import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { AdminPage, Badge, EditLink, StatCard, Table } from '../../ui';
import { formatToman, getProducts } from '@/lib/admin/commerceData';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const { items: products, error } = await getProducts();
  const activeCount = products.filter((p) => p.is_active).length;
  const packageCount = products.filter((p) => p.type === 'package').length;

  return (
    <AdminPage
      title="محصولات"
      desc="مدیریت دوره‌ها و پکیج‌های فروش"
      icon="ShoppingBag"
      headerVariant="commerce"
      action={
        <Link href="/admin/commerce/products/new" className="btn btn-primary">
          <Plus className="h-4 w-4" /> محصول جدید
        </Link>
      }
    >
      <div className="admin-content-list">
        {products.length > 0 ? (
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <StatCard
              label="کل محصولات"
              value={products.length.toLocaleString('fa-IR')}
              icon="ShoppingBag"
              tone="gold"
            />
            <StatCard
              label="فعال"
              value={activeCount.toLocaleString('fa-IR')}
              icon="Eye"
              tone="green"
            />
            <StatCard
              label="پکیج"
              value={packageCount.toLocaleString('fa-IR')}
              icon="Layers"
              tone="blue"
            />
          </div>
        ) : null}

        {error ? <div className="admin-content-list__error">{error}</div> : null}

        <AdminContentPanel
          title="فهرست محصولات"
          summary={
            products.length > 0 ? (
              <>
                {products.length.toLocaleString('fa-IR')} محصول · {activeCount.toLocaleString('fa-IR')} فعال
              </>
            ) : undefined
          }
        >
          {products.length > 0 ? (
            <Table
              head={['عنوان', 'نوع', 'قیمت', 'تخفیف', 'وضعیت', 'عملیات']}
              mobile={products.map((p) => (
                <AdminTableCard
                  key={p.id}
                  title={p.title}
                  fields={[
                    { label: 'اسلاگ', value: p.slug, mono: true },
                    {
                      label: 'نوع',
                      value: (
                        <Badge tone={p.type === 'package' ? 'warning' : 'default'}>
                          {p.type === 'package' ? 'پکیج' : 'عادی'}
                        </Badge>
                      ),
                    },
                    { label: 'قیمت', value: formatToman(p.price) },
                    { label: 'تخفیف', value: p.sale_price ? formatToman(p.sale_price) : '—' },
                    {
                      label: 'وضعیت',
                      value: (
                        <Badge tone={p.is_active ? 'success' : 'default'}>
                          {p.is_active ? 'فعال' : 'غیرفعال'}
                        </Badge>
                      ),
                    },
                  ]}
                  footer={<EditLink href={`/admin/commerce/products/${p.id}`} />}
                />
              ))}
            >
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-surface-soft/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text">{p.title}</p>
                    <p className="text-caption text-text-muted" dir="ltr">
                      {p.slug}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={p.type === 'package' ? 'warning' : 'default'}>
                      {p.type === 'package' ? 'پکیج' : 'عادی'}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{formatToman(p.price)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {p.sale_price ? formatToman(p.sale_price) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={p.is_active ? 'success' : 'default'}>
                      {p.is_active ? 'فعال' : 'غیرفعال'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <EditLink href={`/admin/commerce/products/${p.id}`} />
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <AdminListEmpty
              icon="ShoppingBag"
              title="هنوز محصولی ثبت نشده"
              description="اولین دوره یا پکیج فروش را اضافه کنید تا در فروشگاه و سفارشات نمایش داده شود."
              action={
                <Link href="/admin/commerce/products/new" className="btn btn-primary">
                  <Plus className="h-4 w-4" />
                  افزودن محصول
                </Link>
              }
            />
          )}
        </AdminContentPanel>
      </div>
    </AdminPage>
  );
}
