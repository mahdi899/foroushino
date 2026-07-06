import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { getDashboardSummary } from '@/lib/admin/data';
import { AdminPage, StatCard, Table, Badge } from './ui';
import { OperatorQueueDashboardBanner } from './OperatorQueueDashboardBanner';
import { toFa } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const stats = await getDashboardSummary();

  const cards = [
    { label: 'کل سرنخ‌ها', value: toFa(stats.leads), icon: 'Inbox', hint: 'لیدهای ثبت‌شده از سایت' },
    { label: 'سرنخ جدید', value: toFa(stats.new_leads), icon: 'Bell', hint: 'در انتظار پیگیری' },
    { label: 'محصولات فعال', value: toFa(stats.products), icon: 'ShoppingBag', hint: 'دوره‌ها و محصولات' },
    {
      label: 'سفارش‌ها',
      value: toFa(stats.orders),
      icon: 'Receipt',
      hint: stats.pending_orders > 0 ? `${toFa(stats.pending_orders)} در انتظار پرداخت` : 'خریدهای ثبت‌شده',
    },
    {
      label: 'مقالات',
      value: toFa(stats.articles),
      icon: 'Newspaper',
      hint: stats.published_articles > 0 ? `${toFa(stats.published_articles)} منتشرشده` : 'مجله و insights',
    },
    {
      label: 'صف چت‌بات',
      value: toFa(stats.chatbot.pending_operator),
      icon: 'MessageSquare',
      hint: stats.chatbot.enabled ? 'پیام منتظر اپراتور' : 'چت‌بات غیرفعال است',
    },
  ];

  const quickLinks = [
    { href: '/admin/leads', label: 'لیدها و فرم‌های تماس' },
    { href: '/admin/chatbot', label: 'چت‌بات هوشمند و صف اپراتور' },
    { href: '/admin/commerce/products', label: 'مدیریت محصولات و دوره‌ها' },
    { href: '/admin/commerce/orders', label: 'سفارش‌ها و پرداخت‌ها' },
    { href: '/admin/blog', label: 'مقالات و insights' },
    { href: '/admin/gallery', label: 'کتابخانه رسانه' },
    { href: '/admin/settings', label: 'تنظیمات سایت و تماس' },
  ];

  return (
    <AdminPage title="داشبورد" desc="نمای کلی پنل مدیریت آکادمی بهرام">
      <OperatorQueueDashboardBanner />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
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

        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-h3 text-primary-dark">چت‌بات هوشمند</h2>
            <Link
              href="/admin/chatbot"
              className="card flex items-start gap-4 p-4 transition hover:border-accent"
            >
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${
                  stats.chatbot.pending_operator > 0 ? 'bg-amber-500/15 text-amber-600' : 'bg-surface-soft text-accent'
                }`}
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
            <h2 className="mb-3 text-h3 text-primary-dark">خلاصه محتوا</h2>
            <div className="card divide-y divide-border p-0 text-small">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-text-muted">فایل‌های رسانه</span>
                <span className="font-semibold text-primary-dark">{toFa(stats.media)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-text-muted">مقالات منتشرشده</span>
                <span className="font-semibold text-primary-dark">{toFa(stats.published_articles)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-text-muted">سفارش در انتظار پرداخت</span>
                <span className="font-semibold text-primary-dark">{toFa(stats.pending_orders)}</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-h3 text-primary-dark">دسترسی سریع</h2>
            <div className="grid gap-2">
              {quickLinks.map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  className="card flex items-center justify-between p-4 text-small font-medium text-text hover:border-accent"
                >
                  {q.label}
                  <span className="text-accent">←</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
