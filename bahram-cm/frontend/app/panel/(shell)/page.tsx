import type { Metadata } from 'next';
import { DashboardFeatureCards } from '@/components/student-panel/dashboard/DashboardFeatureCards';
import { DashboardWelcome } from '@/components/student-panel/dashboard/DashboardWelcome';
import { OnboardingChecklist, type ChecklistItem } from '@/components/student-panel/dashboard/OnboardingChecklist';
import { QuickResourceLinks } from '@/components/student-panel/dashboard/QuickResourceLinks';
import type { AcademyLinkKey } from '@/components/student-panel/academy/academyLinkMeta';
import { RecentNotifications } from '@/components/student-panel/dashboard/RecentNotifications';
import { ProgressBar } from '@/components/student-panel/ui/ProgressBar';
import { panelStudentFetch } from '@/lib/student/panelServer';
import { getCurrentStudent } from '@/lib/student/session';
import type { NotificationEntry } from '@/components/student-panel/notifications/NotificationItem';

export const metadata: Metadata = { title: 'داشبورد | پنل کاربری', robots: { index: false, follow: false } };

interface DashboardResponse {
  data: { first_login_at: string | null; checklist: ChecklistItem[] };
}

interface CourseAccess {
  id: number;
  course_type?: 'product' | 'mini';
  product: { title: string; slug?: string } | null;
  is_active: boolean;
}

export default async function PanelDashboardPage() {
  const user = await getCurrentStudent();
  const [{ data }, coursesRes, notificationsRes, referralRes] = await Promise.all([
    panelStudentFetch<DashboardResponse>('/dashboard'),
    panelStudentFetch<{ data: CourseAccess[] }>('/courses').catch(() => ({ data: [] as CourseAccess[] })),
    panelStudentFetch<{ data: NotificationEntry[] }>('/notifications?per_page=3').catch(() => ({ data: [] as NotificationEntry[] })),
    panelStudentFetch<{ data: { summary: { payable_amount: number } } }>('/referrals').catch(() => ({
      data: { summary: { payable_amount: 0 } },
    })),
  ]);

  const doneCount = data.checklist.filter((i) => i.done).length;
  const progress = data.checklist.length ? Math.round((doneCount / data.checklist.length) * 100) : 0;
  const activeCourse = coursesRes.data.find((course) => course.is_active) ?? coursesRes.data[0] ?? null;
  const notifications = notificationsRes.data.slice(0, 3);
  const courseHref = activeCourse
    ? activeCourse.course_type === 'mini' && activeCourse.product?.slug
      ? `/panel/mini-courses/${activeCourse.product.slug}/watch`
      : activeCourse.id
        ? `/panel/courses/${activeCourse.id}/watch`
        : '/panel/courses'
    : '/panel/courses';

  const academyUrls = data.checklist.reduce(
    (acc, item) => {
      if (item.key === 'telegram_channel' || item.key === 'rubika_channel' || item.key === 'telegram_bot') {
        acc[item.key as AcademyLinkKey] = item.url;
      }
      return acc;
    },
    {
      telegram_channel: null,
      rubika_channel: null,
      telegram_bot: null,
    } as Record<AcademyLinkKey, string | null>,
  );

  return (
    <div className="panel-page-inner flex flex-col gap-5 sm:gap-6">
      <DashboardWelcome
        name={user?.profile?.first_name || user?.name || ''}
        doneCount={doneCount}
        totalCount={data.checklist.length}
        progress={progress}
      />

      <DashboardFeatureCards
        courseTitle={activeCourse?.product?.title ?? null}
        courseHref={courseHref}
        referralAmount={referralRes.data.summary.payable_amount}
        courseActive={activeCourse?.is_active ?? false}
      />

      <section className="panel-dashboard-split">
        <RecentNotifications notifications={notifications} />
        <QuickResourceLinks urls={academyUrls} />
      </section>

      <section className="card panel-onboarding-section flex flex-col gap-5 p-5 text-right sm:p-6">
        <div className="panel-onboarding-section__header flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-text">چک‌لیست شروع</h2>
            <p className="panel-section-subtitle">مراحل اولیه برای شروع مسیر یادگیری در آکادمی</p>
          </div>
          <span className="panel-onboarding-section__badge">{progress.toLocaleString('fa-IR')}٪ تکمیل</span>
        </div>
        <OnboardingChecklist items={data.checklist} />
        <div className="panel-onboarding-progress">
          <ProgressBar
            value={progress}
            sublabel={`${doneCount.toLocaleString('fa-IR')} از ${data.checklist.length.toLocaleString('fa-IR')} مرحله تکمیل شد`}
          />
        </div>
      </section>
    </div>
  );
}
