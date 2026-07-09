import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { AdminPage, Badge, EditLink, Table } from '../../ui';
import { getStudentTestimonials } from '@/lib/admin/commerceData';
import { TestimonialRowAvatar } from './TestimonialRowAvatar';

export const dynamic = 'force-dynamic';

export default async function TestimonialsPage() {
  const { items, error } = await getStudentTestimonials();
  const activeCount = items.filter((t) => t.is_active).length;

  return (
    <AdminPage
      title="نظرات دانشجوها"
      desc="داستان‌های تبدیل و کارت‌های صفحه رضایت دانشجوها"
      icon="MessageSquareQuote"
      headerVariant="commerce"
      action={
        <Link href="/admin/commerce/testimonials/new" className="btn btn-primary">
          <Plus className="h-4 w-4" /> نظر جدید
        </Link>
      }
    >
      <div className="admin-content-list">
        {error ? (
          <div className="admin-content-list__error">{error}</div>
        ) : null}

        <AdminContentPanel
          title="فهرست نظرات"
          summary={
            <>
              {items.length.toLocaleString('fa-IR')} نظر · {activeCount.toLocaleString('fa-IR')} فعال
            </>
          }
        >
          {items.length > 0 ? (
            <Table
              head={['', 'نام', 'اسلاگ', 'قبل → بعد', 'ترتیب', 'وضعیت', 'عملیات']}
              mobile={items.map((t) => (
                <AdminTableCard
                  key={t.id}
                  leading={<TestimonialRowAvatar name={t.name} portraitImage={t.portrait_image} />}
                  title={t.name}
                  fields={[
                    { label: 'نقش', value: t.role ?? '—' },
                    { label: 'اسلاگ', value: t.slug, mono: true },
                    {
                      label: 'قبل → بعد',
                      value: (
                        <span className="line-clamp-2">
                          <span className="text-text-muted">{t.before_text}</span>
                          <span className="mx-1">→</span>
                          <span>{t.after_text}</span>
                        </span>
                      ),
                    },
                    { label: 'ترتیب', value: t.sort_order },
                    {
                      label: 'وضعیت',
                      value: (
                        <Badge tone={t.is_active ? 'success' : 'default'}>
                          {t.is_active ? 'فعال' : 'غیرفعال'}
                        </Badge>
                      ),
                    },
                  ]}
                  footer={<EditLink href={`/admin/commerce/testimonials/${t.id}`} />}
                />
              ))}
            >
              {items.map((t) => (
                <tr key={t.id} className="hover:bg-surface-soft/40">
                  <td className="px-4 py-3">
                    <TestimonialRowAvatar name={t.name} portraitImage={t.portrait_image} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{t.name}</p>
                    <p className="text-caption text-text-muted">{t.role}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-caption" dir="ltr">
                    {t.slug}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-caption">
                    <span className="text-text-muted">{t.before_text}</span>
                    <span className="mx-1 text-text-muted">→</span>
                    <span>{t.after_text}</span>
                  </td>
                  <td className="px-4 py-3 text-caption">{t.sort_order}</td>
                  <td className="px-4 py-3">
                    <Badge tone={t.is_active ? 'success' : 'default'}>{t.is_active ? 'فعال' : 'غیرفعال'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <EditLink href={`/admin/commerce/testimonials/${t.id}`} />
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <AdminListEmpty
              icon="MessageSquareQuote"
              title="نظری ثبت نشده"
              description="کارت‌های صفحه رضایت دانشجوها از اینجا مدیریت می‌شوند. تا زمانی که رکورد فعالی نباشد، محتوای پیش‌فرض نمایش داده می‌شود."
              action={
                <Link href="/admin/commerce/testimonials/new" className="btn btn-primary">
                  <Plus className="h-4 w-4" />
                  افزودن نظر
                </Link>
              }
            />
          )}
        </AdminContentPanel>
      </div>
    </AdminPage>
  );
}
