'use client';

import Link from 'next/link';
import { LayoutDashboard, Loader2, MessageSquare, RefreshCw } from 'lucide-react';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { StatCard, Table, Badge } from './ui';
import { DashboardAlerts } from './DashboardAlerts';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { AdminLucideIcon } from '@/lib/admin/lucide-icons';
import { toFa } from '@/lib/utils';
import { cn } from '@/lib/utils';

const QUICK_LINKS = [
  { href: '/admin/chatbot', label: 'چت‌بات', icon: 'MessageSquare', meta: 'صف اپراتور و تنظیمات' },
  { href: '/admin/leads', label: 'لیدها', icon: 'Inbox', meta: 'فرم‌ها و سرنخ‌ها' },
  { href: '/admin/commerce/orders', label: 'سفارشات', icon: 'ShoppingCart', meta: 'پیگیری پرداخت' },
  { href: '/admin/academy/students', label: 'دانشجویان', icon: 'Users', meta: 'باشگاه مشتریان' },
  { href: '/admin/gallery', label: 'رسانه', icon: 'Image', meta: 'کتابخانه تصاویر' },
  { href: '/admin/settings', label: 'تنظیمات', icon: 'Settings', meta: 'پیکربندی سایت' },
] as const;

function SummaryTile({ href, label, value }: { href: string; label: string; value: React.ReactNode }) {
  return (
    <Link href={href} className="admin-dashboard-summary-tile">
      <span className="admin-dashboard-summary-tile__value">{value}</span>
      <span className="admin-dashboard-summary-tile__label">{label}</span>
    </Link>
  );
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
      tone: 'gold' as const,
    },
    {
      label: 'صف چت‌بات',
      value: toFa(stats.chatbot.pending_operator),
      icon: 'MessageSquare',
      hint: stats.chatbot.enabled ? 'پیام منتظر اپراتور' : 'چت‌بات غیرفعال',
      href: '/admin/chatbot',
      tone: 'teal' as const,
    },
    {
      label: 'تیکت باز',
      value: toFa(academy.tickets_open),
      icon: 'LifeBuoy',
      hint: `${toFa(academy.tickets_total)} تیکت کل`,
      href: '/admin/academy/tickets',
      tone: 'blue' as const,
    },
  ];

  const academyCards = [
    {
      label: 'دانشجویان',
      value: toFa(academy.students),
      icon: 'Users',
      hint: `${toFa(academy.active_students)} فعال`,
      href: '/admin/academy/students',
      tone: 'teal' as const,
    },
    {
      label: 'دسترسی فعال',
      value: toFa(academy.course_accesses_active),
      icon: 'KeyRound',
      hint: 'دوره‌های فعال‌شده',
      href: '/admin/academy/course-accesses',
      tone: 'green' as const,
    },
    {
      label: 'سمینارها',
      value: toFa(academy.seminars),
      icon: 'CalendarDays',
      hint: academy.upcoming_seminars > 0 ? `${toFa(academy.upcoming_seminars)} پیش‌رو` : 'رویدادهای ثبت‌شده',
      href: '/admin/academy/seminars',
      tone: 'blue' as const,
    },
    {
      label: 'درخواست SAT',
      value: toFa(academy.sat_applications_pending),
      icon: 'GraduationCap',
      hint: 'در انتظار بررسی',
      href: '/admin/academy/sat-applications',
      tone: 'amber' as const,
    },
    {
      label: 'کش‌بک معلق',
      value: toFa(academy.cashback_payouts_pending),
      icon: 'Wallet',
      hint: `${toFa(academy.referral_conversions)} معرفی موفق`,
      href: '/admin/academy/cashback-payouts',
      tone: 'gold' as const,
    },
  ];

  const commerceCards = [
    {
      label: 'سفارش‌ها',
      value: toFa(stats.orders),
      icon: 'Receipt',
      hint: stats.pending_orders > 0 ? `${toFa(stats.pending_orders)} در انتظار پرداخت` : 'خریدهای ثبت‌شده',
      href: '/admin/commerce/orders',
      tone: 'gold' as const,
    },
    {
      label: 'محصولات فعال',
      value: toFa(stats.products),
      icon: 'ShoppingBag',
      hint: 'دوره‌ها و بسته‌ها',
      href: '/admin/commerce/products',
      tone: 'teal' as const,
    },
    {
      label: 'مقالات',
      value: toFa(stats.articles),
      icon: 'Newspaper',
      hint: `${toFa(stats.published_articles)} منتشرشده`,
      href: '/admin/blog',
      tone: 'blue' as const,
    },
    {
      label: 'رسانه',
      value: toFa(stats.media),
      icon: 'Image',
      hint: 'فایل در کتابخانه',
      href: '/admin/gallery',
      tone: 'green' as const,
    },
  ];

  return (
    <div className={cn('admin-dashboard', loading && 'pointer-events-none opacity-60')}>
      <DashboardAlerts />

      {error ? (
        <p className="text-small text-danger">
          {error} — آمار پیش‌فرض نمایش داده می‌شود.
        </p>
      ) : null}

      <div className="admin-dashboard-welcome">
        <div className="admin-dashboard-welcome__lead">
          <span className="admin-dashboard-welcome__icon">
            <LayoutDashboard className="h-6 w-6" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h1 className="admin-dashboard-welcome__title">داشبورد مدیریت</h1>
            <p className="admin-dashboard-welcome__desc">نمای کلی پیشخوان، آکادمی، فروش و محتوا</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={validating}
          className="btn btn-secondary shrink-0 px-3 py-2 text-small"
          title="بروزرسانی آمار"
        >
          {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          بروزرسانی
        </button>
      </div>

      <section>
        <h2 className="admin-dashboard-section__title">پیشخوان عملیاتی</h2>
        <div className="admin-dashboard-kpi-grid admin-dashboard-kpi-grid--3">
          {frontDeskCards.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="admin-dashboard-section__title">آکادمی و باشگاه مشتریان</h2>
        <div className="admin-dashboard-kpi-grid admin-dashboard-kpi-grid--5">
          {academyCards.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="admin-dashboard-section__title">فروش و محتوا</h2>
        <div className="admin-dashboard-kpi-grid admin-dashboard-kpi-grid--4">
          {commerceCards.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>
      </section>

      <div className="admin-dashboard-layout">
        <div className="admin-dashboard-main">
          <div className="admin-dashboard-panel">
            <div className="admin-dashboard-panel__head">
              <h2 className="admin-dashboard-panel__title">آخرین سرنخ‌ها</h2>
              <Link href="/admin/leads" className="admin-dashboard-panel__action">
                مشاهده همه
              </Link>
            </div>
            <div className="admin-dashboard-panel__body">
              {stats.recent_leads.length > 0 ? (
                <Table
                  head={['نام', 'تلفن', 'وضعیت', 'تاریخ']}
                  mobile={stats.recent_leads.map((l) => (
                    <AdminTableCard
                      key={l.id}
                      title={l.name}
                      fields={[
                        { label: 'تلفن', value: l.phone, mono: true },
                        { label: 'وضعیت', value: <Badge tone={l.status === 'new' ? 'accent' : 'default'}>{l.status_label}</Badge> },
                        {
                          label: 'تاریخ',
                          value: l.created_at ? new Date(l.created_at).toLocaleDateString('fa-IR') : '—',
                        },
                      ]}
                    />
                  ))}
                >
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
                <div className="admin-dashboard-panel__body--padded text-center text-small text-text-muted">
                  هنوز سرنخی ثبت نشده است. با ارسال فرم از سایت یا چت‌بات، لیدها اینجا نمایش داده می‌شوند.
                </div>
              )}
            </div>
          </div>

          <div className="admin-dashboard-panel">
            <div className="admin-dashboard-panel__head">
              <h2 className="admin-dashboard-panel__title">تیکت‌های باز</h2>
              <Link href="/admin/academy/tickets" className="admin-dashboard-panel__action">
                مرکز تیکت
              </Link>
            </div>
            <div className="admin-dashboard-panel__body">
              {stats.recent_tickets.length > 0 ? (
                <Table
                  head={['موضوع', 'دانشجو', 'وضعیت', 'تاریخ']}
                  mobile={stats.recent_tickets.map((t) => (
                    <AdminTableCard
                      key={t.id}
                      title={
                        <Link href={`/admin/academy/tickets/${t.id}`} className="text-accent hover:text-primary">
                          {t.subject}
                        </Link>
                      }
                      fields={[
                        { label: 'دانشجو', value: t.student_name },
                        { label: 'وضعیت', value: <Badge tone="warning">{t.status_label}</Badge> },
                        {
                          label: 'تاریخ',
                          value: t.created_at ? new Date(t.created_at).toLocaleDateString('fa-IR') : '—',
                        },
                      ]}
                    />
                  ))}
                >
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
                <div className="admin-dashboard-panel__body--padded text-center text-small text-text-muted">
                  تیکت بازی در صف نیست. تیکت‌های جدید دانشجوها اینجا نمایش داده می‌شوند.
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="admin-dashboard-aside">
          <Link
            href="/admin/chatbot"
            className={cn(
              'admin-dashboard-panel admin-dashboard-status-card',
              stats.chatbot.pending_operator > 0
                ? 'admin-dashboard-status-card--alert'
                : 'admin-dashboard-status-card--teal',
            )}
          >
            <span
              className={cn(
                'admin-dashboard-status-card__icon',
                stats.chatbot.pending_operator > 0
                  ? 'admin-dashboard-status-card__icon--alert'
                  : 'admin-dashboard-status-card__icon--teal',
              )}
            >
              <MessageSquare className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-small font-semibold text-text">
                {stats.chatbot.enabled ? 'چت‌بات فعال' : 'چت‌بات غیرفعال'}
              </p>
              <p className="mt-1 text-caption text-text-muted">
                {stats.chatbot.pending_operator > 0
                  ? `${toFa(stats.chatbot.pending_operator)} پیام در صف اپراتور`
                  : 'پیامی در صف اپراتور نیست'}
                {' · '}
                {toFa(stats.chatbot.sessions)} مکالمه
              </p>
            </div>
            <span className="admin-dashboard-status-card__action">مدیریت ←</span>
          </Link>

          <div className="admin-dashboard-panel admin-dashboard-panel--quick">
            <div className="admin-dashboard-panel__head">
              <h2 className="admin-dashboard-panel__title">دسترسی سریع</h2>
            </div>
            <div className="admin-dashboard-panel__body admin-dashboard-panel__body--padded">
              <div className="admin-dashboard-quick-grid">
                {QUICK_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="admin-dashboard-quick-link"
                    title={item.meta}
                  >
                    <span className="admin-dashboard-quick-link__icon">
                      <AdminLucideIcon name={item.icon} strokeWidth={2} />
                    </span>
                    <span className="admin-dashboard-quick-link__label">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="admin-dashboard-panel">
            <div className="admin-dashboard-panel__head">
              <h2 className="admin-dashboard-panel__title">خلاصه عملیاتی</h2>
            </div>
            <div className="admin-dashboard-panel__body admin-dashboard-panel__body--padded">
              <div className="admin-dashboard-summary-split">
                <div className="admin-dashboard-summary-group">
                  <h3 className="admin-dashboard-summary-group__title">آکادمی</h3>
                  <div className="admin-dashboard-summary-grid">
                    <SummaryTile href="/admin/academy/students" label="دانشجویان فعال" value={toFa(academy.active_students)} />
                    <SummaryTile href="/admin/academy/course-accesses" label="دسترسی دوره" value={toFa(academy.course_accesses_active)} />
                    <SummaryTile href="/admin/academy/referrals" label="معرفی موفق" value={toFa(academy.referral_conversions)} />
                    <SummaryTile href="/admin/academy/notifications" label="اعلان ارسالی" value={toFa(academy.notifications_sent)} />
                  </div>
                </div>
                <div className="admin-dashboard-summary-group">
                  <h3 className="admin-dashboard-summary-group__title">فروش و محتوا</h3>
                  <div className="admin-dashboard-summary-grid">
                    <SummaryTile href="/admin/commerce/orders" label="در انتظار پرداخت" value={toFa(stats.pending_orders)} />
                    <SummaryTile href="/admin/blog" label="مقاله منتشرشده" value={toFa(stats.published_articles)} />
                    <SummaryTile href="/admin/gallery" label="فایل رسانه" value={toFa(stats.media)} />
                    <SummaryTile href="/admin/commerce/orders/reports" label="گزارش سفارش" value="←" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
