import type { Metadata } from 'next';
import Link from 'next/link';
import { Bell, BookOpen, ChevronLeft, Gift, LifeBuoy, Send, Bot, MessageCircle } from 'lucide-react';
import { OnboardingChecklist, type ChecklistItem } from '@/components/student-panel/dashboard/OnboardingChecklist';
import { getCurrentStudent, studentFetch } from '@/lib/student/session';
import type { NotificationEntry } from '@/components/student-panel/notifications/NotificationItem';

export const metadata: Metadata = { title: 'داشبورد | پنل کاربری', robots: { index: false, follow: false } };

interface DashboardResponse {
  data: { first_login_at: string | null; checklist: ChecklistItem[] };
}

interface CourseAccess {
  id: number;
  product: { title: string } | null;
  is_active: boolean;
}

export default async function PanelDashboardPage() {
  const user = await getCurrentStudent();
  const [{ data }, coursesRes, notificationsRes] = await Promise.all([
    studentFetch<DashboardResponse>('/dashboard'),
    studentFetch<{ data: CourseAccess[] }>('/courses').catch(() => ({ data: [] as CourseAccess[] })),
    studentFetch<{ data: NotificationEntry[] }>('/notifications?per_page=3').catch(() => ({ data: [] as NotificationEntry[] })),
  ]);

  const doneCount = data.checklist.filter((i) => i.done).length;
  const progress = data.checklist.length ? Math.round((doneCount / data.checklist.length) * 100) : 0;
  const activeCourse = coursesRes.data.find((course) => course.is_active) ?? coursesRes.data[0] ?? null;
  const notifications = notificationsRes.data.slice(0, 3);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <section className="card relative overflow-hidden p-5 sm:p-6">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-xl font-bold text-text sm:text-2xl">
            سلام {user?.profile?.first_name || user?.name}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            از اینجا مسیر یادگیری، پشتیبانی، اعلان‌ها و باشگاه مشتریان را یک‌جا مدیریت می‌کنی.
          </p>
          <div className="mt-5 max-w-md">
            <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
              <span>پیشرفت شروع</span>
              <span>{doneCount} از {data.checklist.length}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-accent/10 blur-3xl" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link href={activeCourse ? `/panel/courses/${activeCourse.id}/watch` : '/panel/courses'} className="card flex items-center gap-4 p-4 transition hover:border-primary/50 hover:shadow-glow">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <BookOpen size={22} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs text-text-muted">دوره فعال</span>
            <span className="block truncate text-sm font-bold text-text">{activeCourse?.product?.title ?? 'مشاهده دوره‌ها'}</span>
            <span className="mt-1 block text-xs text-primary">ادامه یادگیری</span>
          </span>
        </Link>
        <Link href="/panel/referrals" className="card flex items-center gap-4 p-4 transition hover:shadow-glow">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: 'var(--color-gold-soft)', color: 'var(--color-gold)' }}>
            <Gift size={22} />
          </span>
          <span>
            <span className="block text-xs text-text-muted">باشگاه مشتریان</span>
            <span className="block text-sm font-bold text-text">کش‌بک و معرفی دوستان</span>
          </span>
        </Link>
        <Link href="/panel/support" className="card flex items-center gap-4 p-4 transition hover:border-primary/50 hover:shadow-glow">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <LifeBuoy size={22} />
          </span>
          <span>
            <span className="block text-xs text-text-muted">پشتیبانی</span>
            <span className="block text-sm font-bold text-text">ارسال تیکت و پیگیری</span>
          </span>
        </Link>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-text">قدم‌های شروع</h2>
            <span className="badge badge-neutral">{progress}%</span>
          </div>
          <OnboardingChecklist items={data.checklist} />
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-text">
              <Bell size={17} className="text-primary" />
              اعلان‌های اخیر
            </h2>
            <Link href="/panel/notifications" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              همه
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
          {notifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">اعلانی وجود ندارد.</p>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((notification) => (
                <li key={notification.id} className="py-3">
                  <p className={`text-sm ${notification.read_at ? 'text-text-muted' : 'font-semibold text-text'}`}>{notification.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-text-muted">{notification.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-base font-bold text-text">لینک‌های مهم</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { label: 'کانال تلگرام', href: 'https://t.me/', icon: Send },
            { label: 'کانال روبیکا', href: 'https://rubika.ir/', icon: MessageCircle },
            { label: 'ربات تلگرام', href: 'https://t.me/', icon: Bot },
          ].map(({ label, href, icon: Icon }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-3 rounded-xl border border-border/50 bg-surface-soft px-3 py-2 text-sm font-medium text-text transition hover:border-primary/50">
              <Icon size={17} className="text-primary" />
              {label}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
