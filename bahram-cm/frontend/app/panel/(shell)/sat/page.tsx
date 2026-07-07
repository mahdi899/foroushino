import type { Metadata } from 'next';
import { SatApplicationForm } from '@/components/student-panel/sat/SatApplicationForm';
import { getCurrentStudent, studentFetch } from '@/lib/student/session';

export const metadata: Metadata = { title: 'سات | پنل کاربری', robots: { index: false, follow: false } };

interface SatApplication {
  id: number;
  status: string;
  city: string | null;
  age: number | null;
  submitted_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  received: 'دریافت‌شده',
  reviewing: 'در حال بررسی',
  accepted: 'پذیرفته‌شده',
  rejected: 'رد شده',
};

export default async function PanelSatPage() {
  const [user, { data: application }] = await Promise.all([
    getCurrentStudent(),
    studentFetch<{ data: SatApplication | null }>('/sat-application'),
  ]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-xl font-bold text-text">سات (درخواست همکاری)</h1>

      {application ? (
        <div className="card p-6">
          <p className="text-sm text-text-muted">وضعیت درخواست شما:</p>
          <span className="badge badge-neutral mt-2">{STATUS_LABELS[application.status] ?? application.status}</span>
        </div>
      ) : (
        <div className="card p-6">
          <SatApplicationForm mobile={user?.mobile ?? ''} />
        </div>
      )}
    </div>
  );
}
