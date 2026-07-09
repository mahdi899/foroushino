import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { AdminPage, Badge, EditLink, Table } from '../../ui';
import { getFaqs } from '@/lib/admin/commerceData';

export const dynamic = 'force-dynamic';

export default async function FaqsPage() {
  const { items: faqs, error } = await getFaqs();
  const activeCount = faqs.filter((f) => f.is_active).length;

  return (
    <AdminPage
      title="سوالات متداول فروش"
      desc="FAQ محصولات و صفحات خرید"
      icon="HelpCircle"
      headerVariant="commerce"
      action={
        <Link href="/admin/commerce/faqs/new" className="btn btn-primary">
          <Plus className="h-4 w-4" /> سوال جدید
        </Link>
      }
    >
      <div className="admin-content-list">
        {error ? (
          <div className="admin-content-list__error">{error}</div>
        ) : null}

        <AdminContentPanel
          title="فهرست سوالات"
          summary={
            <>
              {faqs.length.toLocaleString('fa-IR')} سوال · {activeCount.toLocaleString('fa-IR')} فعال
            </>
          }
        >
          {faqs.length > 0 ? (
            <Table
              head={['سوال', 'دسته', 'ترتیب', 'وضعیت', 'عملیات']}
              mobile={faqs.map((f) => (
                <AdminTableCard
                  key={f.id}
                  title={<p className="line-clamp-2">{f.question}</p>}
                  fields={[
                    { label: 'دسته', value: f.category ?? '—' },
                    { label: 'ترتیب', value: f.sort_order },
                    {
                      label: 'وضعیت',
                      value: (
                        <Badge tone={f.is_active ? 'success' : 'default'}>
                          {f.is_active ? 'فعال' : 'غیرفعال'}
                        </Badge>
                      ),
                    },
                  ]}
                  footer={<EditLink href={`/admin/commerce/faqs/${f.id}`} />}
                />
              ))}
            >
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
            <AdminListEmpty
              icon="HelpCircle"
              title="سوالی ثبت نشده"
              description="سوالات پرتکرار خرید را اضافه کنید تا در صفحات محصول نمایش داده شوند."
              action={
                <Link href="/admin/commerce/faqs/new" className="btn btn-primary">
                  <Plus className="h-4 w-4" />
                  افزودن سوال
                </Link>
              }
            />
          )}
        </AdminContentPanel>
      </div>
    </AdminPage>
  );
}
