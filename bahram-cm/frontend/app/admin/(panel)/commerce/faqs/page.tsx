import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AdminPage, Badge, EditLink, Table } from '../../ui';
import { getFaqs } from '@/lib/admin/commerceData';

export const dynamic = 'force-dynamic';

export default async function FaqsPage() {
  const { items: faqs, error } = await getFaqs();

  return (
    <AdminPage
      title="سوالات متداول فروش"
      desc="FAQ محصولات و صفحات خرید"
      action={
        <Link href="/admin/commerce/faqs/new" className="btn btn-primary">
          <Plus className="h-4 w-4" /> سوال جدید
        </Link>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">
          {error}
        </div>
      )}
      {faqs.length > 0 ? (
        <Table head={['سوال', 'دسته', 'ترتیب', 'وضعیت', 'عملیات']}>
          {faqs.map((f) => (
            <tr key={f.id} className="hover:bg-surface-soft/40">
              <td className="max-w-md px-4 py-3">
                <p className="line-clamp-2 font-medium">{f.question}</p>
              </td>
              <td className="px-4 py-3 text-caption">{f.category ?? '—'}</td>
              <td className="px-4 py-3 text-caption">{f.sort_order}</td>
              <td className="px-4 py-3">
                <Badge tone={f.is_active ? 'success' : 'default'}>{f.is_active ? 'فعال' : 'غیرفعال'}</Badge>
              </td>
              <td className="px-4 py-3">
                <EditLink href={`/admin/commerce/faqs/${f.id}`} />
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-h3 text-primary-dark">سوالی ثبت نشده</p>
          <Link href="/admin/commerce/faqs/new" className="btn btn-primary mt-4">افزودن سوال</Link>
        </div>
      )}
    </AdminPage>
  );
}
