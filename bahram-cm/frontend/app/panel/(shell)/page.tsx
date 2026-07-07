import type { Metadata } from 'next';
import { OnboardingChecklist, type ChecklistItem } from '@/components/student-panel/dashboard/OnboardingChecklist';
import { getCurrentStudent, studentFetch } from '@/lib/student/session';

export const metadata: Metadata = { title: 'داشبورد | پنل کاربری', robots: { index: false, follow: false } };

interface DashboardResponse {
  data: { first_login_at: string | null; checklist: ChecklistItem[] };
}

export default async function PanelDashboardPage() {
  const user = await getCurrentStudent();
  const { data } = await studentFetch<DashboardResponse>('/dashboard');
  const doneCount = data.checklist.filter((i) => i.done).length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="card p-6">
        <h1 className="text-xl font-bold text-text">
          سلام {user?.profile?.first_name || user?.name} 👋
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          به پنل کاربری آکادمی بهرام رستمی خوش آمدی. از اینجا می‌تونی دوره، سمینارها، باشگاه مشتریان و پشتیبانی رو مدیریت کنی.
        </p>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-text">قدم‌های شروع</h2>
          <span className="badge badge-neutral">
            {doneCount} از {data.checklist.length}
          </span>
        </div>
        <OnboardingChecklist items={data.checklist} />
      </div>
    </div>
  );
}
