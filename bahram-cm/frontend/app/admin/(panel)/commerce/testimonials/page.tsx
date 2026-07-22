import Link from 'next/link';
import { Plus, Sparkles } from 'lucide-react';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';
import { AdminPage, Badge, EditLink, StatCard, Table } from '../../ui';
import { getStudentTestimonials } from '@/lib/admin/commerceData';
import { TestimonialMobileCard } from './TestimonialMobileCard';
import { TestimonialRowAvatar } from './TestimonialRowAvatar';

export const dynamic = 'force-dynamic';

export default async function TestimonialsPage() {
  const { items, error } = await getStudentTestimonials();
  const activeCount = items.filter((t) => t.is_active).length;
  const pulseCount = items.filter((t) => t.show_in_family_pulse && t.is_active).length;

  return (
    <AdminPage
      title="نظرات دانشجوها"
      desc="داستان‌های تبدیل، کارت‌های رضایت و نظرات مارکی صفحه اصلی"
      icon="MessageSquareQuote"
      headerVariant="commerce"
      action={
        <Link href="/admin/commerce/testimonials/new" className="btn btn-primary hidden sm:inline-flex">
          <Plus className="h-4 w-4" /> نظر جدید
        </Link>
      }
    >
      <div className="admin-content-list admin-testimonials-page">
        {items.length > 0 ? (
          <div className="admin-testimonials-page__stats admin-content-list__stats">
            <StatCard
              label="کل داستان‌ها"
              value={items.length.toLocaleString('fa-IR')}
              icon="MessageSquareQuote"
              tone="gold"
              hint="کارت تبدیل در سایت"
            />
            <StatCard
              label="فعال در سایت"
              value={activeCount.toLocaleString('fa-IR')}
              icon="Sparkles"
              tone="green"
              hint="نمایش در صفحه transformations"
            />
            <StatCard
              label="صفحه اصلی"
              value={pulseCount.toLocaleString('fa-IR')}
              icon="Home"
              tone="teal"
              hint="مارکی خانواده داداش بهرام"
            />
          </div>
        ) : null}

        <Link
          href="/admin/commerce/testimonials/new"
          className="admin-testimonials-page__cta sm:hidden"
        >
          <span className="admin-testimonials-page__cta-icon">
            <Plus className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </span>
          <span className="min-w-0 flex-1 text-start">
            <span className="block text-sm font-bold">افزودن داستان جدید</span>
            <span className="block text-xs opacity-90">کارت تبدیل برای صفحه رضایت دانشجوها</span>
          </span>
          <Sparkles className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
        </Link>

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
              head={['', 'نام', 'اسلاگ', 'قبل → بعد', 'ترتیب', 'وضعیت', 'صفحه اصلی', 'عملیات']}
              mobile={items.map((t) => (
                <TestimonialMobileCard key={t.id} testimonial={t} />
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
                    <Badge tone={t.is_active ? 'success' : 'default'}>
                      {t.is_active ? 'فعال' : 'غیرفعال'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {t.show_in_family_pulse ? (
                      <Badge tone="accent">مارکی</Badge>
                    ) : (
                      <span className="text-caption text-text-muted">—</span>
                    )}
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
