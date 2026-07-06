import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AdminPage, Badge, EditLink, Table } from '../../ui';
import { getStudentTestimonials } from '@/lib/admin/commerceData';
import { TestimonialRowAvatar } from './TestimonialRowAvatar';

export const dynamic = 'force-dynamic';

export default async function TestimonialsPage() {
  const { items, error } = await getStudentTestimonials();

  return (
    <AdminPage
      title="نظرات دانشجوها"
      desc="داستان‌های تبدیل و کارت‌های صفحه رضایت دانشجوها"
      action={
        <Link href="/admin/commerce/testimonials/new" className="btn btn-primary">
          <Plus className="h-4 w-4" /> نظر جدید
        </Link>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">
          {error}
        </div>
      )}
      {items.length > 0 ? (
        <Table head={['', 'نام', 'اسلاگ', 'قبل → بعد', 'ترتیب', 'وضعیت', 'عملیات']}>
          {items.map((t) => (
            <tr key={t.id} className="hover:bg-surface-soft/40">
              <td className="px-4 py-3">
                <TestimonialRowAvatar name={t.name} portraitImage={t.portrait_image} />
              </td>
              <td className="px-4 py-3">
                <p className="font-medium">{t.name}</p>
                <p className="text-caption text-muted">{t.role}</p>
              </td>
              <td className="px-4 py-3 font-mono text-caption" dir="ltr">
                {t.slug}
              </td>
              <td className="max-w-xs px-4 py-3 text-caption">
                <span className="text-muted">{t.before_text}</span>
                <span className="mx-1 text-muted">→</span>
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
        <div className="card p-10 text-center">
          <p className="text-h3 text-primary-dark">نظری ثبت نشده</p>
          <p className="mt-2 text-small text-muted">
            کارت‌های /transformations از اینجا مدیریت می‌شوند. تا زمانی که رکوردی فعال نباشد، محتوای MDX نمایش داده می‌شود.
          </p>
          <Link href="/admin/commerce/testimonials/new" className="btn btn-primary mt-4">
            افزودن نظر
          </Link>
        </div>
      )}
    </AdminPage>
  );
}
