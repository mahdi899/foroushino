import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AdminPage, Badge, EditLink, Table } from '../../ui';
import { formatToman, getProducts } from '@/lib/admin/commerceData';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const { items: products, error } = await getProducts();

  return (
    <AdminPage
      title="محصولات"
      desc="مدیریت دوره‌ها و پکیج‌های فروش"
      action={
        <Link href="/admin/commerce/products/new" className="btn btn-primary">
          <Plus className="h-4 w-4" /> محصول جدید
        </Link>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">
          {error}
        </div>
      )}
      {products.length > 0 ? (
        <Table head={['عنوان', 'نوع', 'قیمت', 'تخفیف', 'وضعیت', 'عملیات']}>
          {products.map((p) => (
            <tr key={p.id} className="hover:bg-surface-soft/40">
              <td className="px-4 py-3">
                <p className="font-medium text-text">{p.title}</p>
                <p className="text-caption text-text-muted" dir="ltr">{p.slug}</p>
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
        <div className="card p-10 text-center">
          <p className="text-h3 text-primary-dark">هنوز محصولی ثبت نشده</p>
          <p className="mt-2 text-small text-text-muted">اولین محصول فروش را اضافه کنید.</p>
          <Link href="/admin/commerce/products/new" className="btn btn-primary mt-4">
            افزودن محصول
          </Link>
        </div>
      )}
    </AdminPage>
  );
}
