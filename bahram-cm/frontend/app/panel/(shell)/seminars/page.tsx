import type { Metadata } from 'next';
import { CalendarDays } from 'lucide-react';
import { PanelPageHeader } from '@/components/student-panel/layout/PanelPageHeader';
import { SeminarFeaturedBanner, SeminarVideoList } from '@/components/student-panel/seminars/SeminarArchive';
import { SeminarStatsRibbon } from '@/components/student-panel/seminars/SeminarStatsRibbon';
import { panelStudentFetch } from '@/lib/student/panelServer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'سمینارهای من | پنل کاربری', robots: { index: false, follow: false } };

interface SeminarListItem {
  id: number;
  slug: string;
  title: string;
  date: string | null;
  location: string | null;
  attendance_status: string | null;
}

export default async function PanelSeminarsPage() {
  const { data: seminars } = await panelStudentFetch<{ data: SeminarListItem[] }>('/seminars');
  // Backend statuses: registered | attended | absent — prefer upcoming/registered for the banner.
  const active =
    seminars.find((s) => s.attendance_status === 'registered') ??
    seminars.find((s) => s.attendance_status === 'attended') ??
    seminars[0] ??
    null;
  const recentCount = seminars.filter((s) => {
    if (!s.date) return false;
    const diff = Date.now() - new Date(s.date).getTime();
    return diff < 30 * 86400000;
  }).length;

  return (
    <div className="panel-page-inner flex flex-col gap-5">
      <PanelPageHeader
        icon={CalendarDays}
        title="سمینارهای من"
        description="رویدادها، ویدیوها و گواهی‌های مرتبط با سمینارها"
      />

      {seminars.length === 0 ? (
        <div className="panel-empty-state card flex flex-col items-center gap-3 p-10 text-center">
          <CalendarDays size={32} className="text-text-muted" />
          <p className="text-sm text-text-muted">هنوز در سمیناری ثبت‌نام نکرده‌اید.</p>
        </div>
      ) : (
        <>
          <SeminarStatsRibbon total={seminars.length} recent={recentCount || Math.min(3, seminars.length)} />

          <div className="panel-aside-layout">
            <div className="flex flex-col gap-5">
              {active ? <SeminarFeaturedBanner seminar={active} /> : null}
              <SeminarVideoList seminars={seminars} />
            </div>

            <aside className="card p-5">
              <h3 className="panel-card-title mb-3">نکات مهم</h3>
              <ul className="panel-card-text space-y-3 leading-relaxed">
                <li>ویدیوهای ضبط‌شده از صفحه جزئیات هر سمینار قابل مشاهده است.</li>
                <li>گواهی حضور پس از تأیید تیم آکادمی فعال می‌شود.</li>
                <li>برای رویدادهای حضوری، مکان و زمان در بنر سمینار نمایش داده می‌شود.</li>
              </ul>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
