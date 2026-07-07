import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { studentFetch } from '@/lib/student/session';

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
  const { data: seminars } = await studentFetch<{ data: SeminarListItem[] }>('/seminars');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-bold text-text">سمینارهای من</h1>

      {seminars.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <CalendarDays size={32} className="text-text-muted" />
          <p className="text-sm text-text-muted">هنوز در سمیناری ثبت‌نام نکرده‌اید.</p>
        </div>
      ) : (
        <div className="card divide-y divide-border">
          {seminars.map((seminar) => (
            <Link
              key={seminar.id}
              href={`/panel/seminars/${seminar.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-surface-soft"
            >
              <div>
                <p className="text-sm font-semibold text-text">{seminar.title}</p>
                {seminar.location ? <p className="mt-1 text-xs text-text-muted">{seminar.location}</p> : null}
              </div>
              {seminar.date ? (
                <span className="text-xs text-text-muted" dir="ltr">
                  {new Date(seminar.date).toLocaleDateString('fa-IR')}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
