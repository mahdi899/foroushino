'use client';

import Link from 'next/link';
import { Loader2, MessageSquare, RefreshCw } from 'lucide-react';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { AdminPage, StatCard, Table, Badge } from './ui';
import { DashboardAlerts } from './DashboardAlerts';
import { adminNav } from './admin-nav';
import { toFa } from '@/lib/utils';
import { cn } from '@/lib/utils';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-h3 text-primary-dark">{children}</h2>;
}

export function AdminDashboardClient() {
  const { stats, loading, validating, error, refresh } = useDashboardSummary();
  const { academy } = stats;

  const frontDeskCards = [
    {
      label: 'سرنخ جدید',
      value: toFa(stats.new_leads),
      icon: 'Bell',
      hint: `${toFa(stats.leads)} سرنخ کل`,
      href: '/admin/leads',
    },
    {
      label: 'صف چت‌بات',
      value: toFa(stats.chatbot.pending_operator),
      icon: 'MessageSquare',
      hint: stats.chatbot.enabled ? 'پیام منتظر اپراتور' : 'چت‌بات غیرفعال',
      href: '/admin/chatbot',
    },
    {
      label: 'تیکت باز',
      value: toFa(academy.tickets_open),
      icon: 'LifeBuoy',
      hint: `${toFa(academy.tickets_total)} تیکت کل`,
      href: '/admin/academy/tickets',
    },
  ];

  const commerceCards = [
    {
      label: 'سفارش‌ها',
      value: toFa(stats.orders),
      icon: 'Receipt',
      hint: stats.pending_orders > 0 ? `${toFa(stats.pending_orders)} در انتظار پرداخت` : 'خریدهای ثبت‌شده',
      href: '/admin/commerce/orders',
    },
    {
      label: 'محصولات فعال',
      value: toFa(stats.products),
      icon: 'ShoppingBag',
      hint: 'دوره‌ها و بسته‌ها',
      href: '/admin/commerce/products',
    },
  ];

  const academyCards = [
    {
      label: 'دانشجویان',
      value: toFa(academy.students),
      icon: 'Users',
      hint: `${toFa(academy.active_students)} فعال`,
      href: '/admin/academy/students',
    },
    {
      label: 'دسترسی فعال',
      value: toFa(academy.course_accesses_active),
      icon: 'KeyRound',
      hint: 'دوره‌های فعال‌شده',
      href: '/admin/academy/course-accesses',
    },
    {
      label: 'سمینارها',
      value: toFa(academy.seminars),
      icon: 'CalendarDays',
      hint: academy.upcoming_seminars > 0 ? `${toFa(academy.upcoming_seminars)} پیش‌رو` : 'رویدادهای ثبت‌شده',
      href: '/admin/academy/seminars',
    },
    {
      label: 'درخواست SAT',
      value: toFa(academy.sat_applications_pending),
      icon: 'GraduationCap',
      hint: 'در انتظار بررسی',
      href: '/admin/academy/sat-applications',
    },
    {
      label: 'کش‌بک معلق',
      value: toFa(academy.cashback_payouts_pending),
      icon: 'Wallet',
      hint: `${toFa(academy.referral_conversions)} معرفی موفق`,
      href: '/admin/academy/cashback-payouts',
    },
  ];

  const contentCards = [
    {
      label: 'مقالات',
      value: toFa(stats.articles),
      icon: 'Newspaper',
      hint: `${toFa(stats.published_articles)} منتشرشده`,
      href: '/admin/blog',
    },
    {
      label: 'رسانه',
      value: toFa(stats.media),
      icon: 'Image',
      hint: 'فایل در کتابخانه',
      href: '/admin/gallery',
    },
  ];

  const quickNavGroups = adminNav.filter((g) => g.group !== 'پیشخوان');

  return (
    <AdminPage
      title="داشبورد"
      desc="نمای کلی پنل مدیریت آکادمی بهرام"
      action={
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={validating}
          className="btn btn-secondary px-3 py-2 text-small"
          title="بروزرسانی آمار"
        >
          {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          بروزرسانی
        </button>
      }
    >
      <DashboardAlerts />

      {error && (
        <p className="mb-4 text-small text-danger">
          {error} — آمار پیش‌فرض نمایش داده می‌شود.
        </p>
      )}

      <div className={cn('space-y-8', loading && 'pointer-events-none opacity-60')}>
        <section>
          <SectionTitle>پیشخوان</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {frontDeskCards.map((c) => (
              <StatCard key={c.label} {...c} />
            ))}
          </div>
        </section>

        <section>
          <SectionTitle>آکادمی و باشگاه مشتریان</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {academyCards.map((c) => (
              <StatCard key={c.label} {...c} />
            ))}
          </div>
        </section>

        <section>
          <SectionTitle>فروش و محتوا</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...commerceCards, ...contentCards].map((c) => (
              <StatCard key={c.label} {...c} />
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-h3 text-primary-dark">آخرین سرنخ‌ها</h2>
                <Link href="/admin/leads" className="text-small font-medium text-accent">
                  مشاهده همه
                </Link>
              </div>
              {stats.recent_leads.length > 0 ? (
                <Table head={['نام', 'تلفن', 'وضعیت', 'تاریخ']}>
                  {stats.recent_leads.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-3 font-medium text-text">{l.name}</td>
                      <td className="px-4 py-3 text-text-muted" dir="ltr">
                        {l.phone}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={l.status === 'new' ? 'accent' : 'default'}>{l.status_label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {l.created_at ? new Date(l.created_at).toLocaleDateString('fa-IR') : '—'}
                      </td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <div className="card p-8 text-center text-small text-text-muted">
                  هنوز سرنخی ثبت نشده است. با ارسال فرم از سایت یا چت‌بات، لیدها اینجا نمایش داده می‌شوند.
                </div>
              )}
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-h3 text-primary-dark">تیکت‌های باز</h2>
                <Link href="/admin/academy/tickets" className="text-small font-medium text-accent">
                  مرکز تیکت
                </Link>
              </div>
              {stats.recent_tickets.length > 0 ? (
                <Table head={['موضوع', 'دانشجو', 'وضعیت', 'تاریخ']}>
                  {stats.recent_tickets.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/academy/tickets/${t.id}`} className="font-medium text-text hover:text-accent">
                          {t.subject}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{t.student_name}</td>
                      <td className="px-4 py-3">
                        <Badge tone="warning">{t.status_label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString('fa-IR') : '—'}
                      </td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <div className="card p-8 text-center text-small text-text-muted">
                  تیکت بازی در صف نیست. تیکت‌های جدید دانشجوها اینجا نمایش داده می‌شوند.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <SectionTitle>چت‌بات هوشمند</SectionTitle>
              <Link
                href="/admin/chatbot"
                className="card flex items-start gap-4 p-4 transition hover:border-accent"
              >
                <span
                  className={cn(
                    'grid h-11 w-11 shrink-0 place-items-center rounded-lg',
                    stats.chatbot.pending_operator > 0 ? 'bg-amber-500/15 text-amber-600' : 'bg-surface-soft text-accent',
                  )}
                >
                  <MessageSquare className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-small font-semibold text-primary-dark">
                    {stats.chatbot.enabled ? 'چت‌بات فعال' : 'چت‌بات غیرفعال'}
                  </p>
                  <p className="mt-1 text-caption text-text-muted">
                    {stats.chatbot.pending_operator > 0
                      ? `${toFa(stats.chatbot.pending_operator)} پیام در صف اپراتور`
                      : 'پیامی در صف اپراتور نیست'}
                  </p>
                  <p className="mt-1 text-caption text-text-muted">
                    {toFa(stats.chatbot.sessions)} مکالمه ثبت‌شده
                  </p>
                </div>
                <span className="shrink-0 text-caption font-semibold text-accent">مدیریت ←</span>
              </Link>
            </div>

            <div>
              <SectionTitle>خلاصه آکادمی</SectionTitle>
              <div className="card divide-y divide-border p-0 text-small">
                <Link href="/admin/academy/students" className="flex items-center justify-between px-4 py-3 transition hover:bg-surface-soft/50">
                  <span className="text-text-muted">دانشجویان فعال</span>
                  <span className="font-semibold text-primary-dark">{toFa(academy.active_students)}</span>
                </Link>
                <Link href="/admin/academy/course-accesses" className="flex items-center justify-between px-4 py-3 transition hover:bg-surface-soft/50">
                  <span className="text-text-muted">دسترسی دوره فعال</span>
                  <span className="font-semibold text-primary-dark">{toFa(academy.course_accesses_active)}</span>
                </Link>
                <Link href="/admin/academy/referrals" className="flex items-center justify-between px-4 py-3 transition hover:bg-surface-soft/50">
                  <span className="text-text-muted">معرفی‌های موفق</span>
                  <span className="font-semibold text-primary-dark">{toFa(academy.referral_conversions)}</span>
                </Link>
                <Link href="/admin/academy/notifications" className="flex items-center justify-between px-4 py-3 transition hover:bg-surface-soft/50">
                  <span className="text-text-muted">اعلان‌های ارسالی</span>
                  <span className="font-semibold text-primary-dark">{toFa(academy.notifications_sent)}</span>
                </Link>
                <Link href="/admin/academy/sms" className="flex items-center justify-between px-4 py-3 transition hover:bg-surface-soft/50">
                  <span className="text-text-muted">مرکز پیامک</span>
                  <span className="font-semibold text-accent">مدیریت ←</span>
                </Link>
              </div>
            </div>

            <div>
              <SectionTitle>خلاصه فروش و محتوا</SectionTitle>
              <div className="card divide-y divide-border p-0 text-small">
                <Link href="/admin/commerce/orders" className="flex items-center justify-between px-4 py-3 transition hover:bg-surface-soft/50">
                  <span className="text-text-muted">سفارش در انتظار پرداخت</span>
                  <span className="font-semibold text-primary-dark">{toFa(stats.pending_orders)}</span>
                </Link>
                <Link href="/admin/blog" className="flex items-center justify-between px-4 py-3 transition hover:bg-surface-soft/50">
                  <span className="text-text-muted">مقالات منتشرشده</span>
                  <span className="font-semibold text-primary-dark">{toFa(stats.published_articles)}</span>
                </Link>
                <Link href="/admin/gallery" className="flex items-center justify-between px-4 py-3 transition hover:bg-surface-soft/50">
                  <span className="text-text-muted">فایل‌های رسانه</span>
                  <span className="font-semibold text-primary-dark">{toFa(stats.media)}</span>
                </Link>
                <Link href="/admin/commerce/orders/reports" className="flex items-center justify-between px-4 py-3 transition hover:bg-surface-soft/50">
                  <span className="text-text-muted">گزارش سفارشات</span>
                  <span className="font-semibold text-accent">مشاهده ←</span>
                </Link>
              </div>
            </div>

            <div>
              <SectionTitle>دسترسی سریع</SectionTitle>
              <div className="space-y-4">
                {quickNavGroups.map((group) => (
                  <div key={group.group}>
                    <p className="mb-2 text-caption font-semibold text-text-muted">{group.group}</p>
                    <div className="grid gap-2">
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="card flex items-center justify-between p-3 text-small font-medium text-text hover:border-accent"
                        >
                          {item.label}
                          <span className="text-accent">←</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
