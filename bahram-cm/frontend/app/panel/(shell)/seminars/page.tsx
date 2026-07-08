import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, MapPin, Trophy, Video } from 'lucide-react';
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
  const active = seminars.find((seminar) => seminar.attendance_status !== 'completed') ?? seminars[0] ?? null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <CalendarDays size={24} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-text">سمینارهای من</h1>
          <p className="text-sm text-text-muted">رویدادها، ویدیوها و گواهی‌های مرتبط با سمینارها</p>
        </div>
      </div>

      {seminars.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <CalendarDays size={32} className="text-text-muted" />
          <p className="text-sm text-text-muted">هنوز در سمیناری ثبت‌نام نکرده‌اید.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-text">{seminars.length.toLocaleString('fa-IR')}</p>
              <p className="mt-1 text-xs text-text-muted">سمینار ثبت‌شده</p>
            </div>
            <div className="card p-4">
              <Video size={18} className="text-primary" />
              <p className="mt-3 text-sm font-bold text-text">ویدیوهای آموزشی</p>
              <p className="mt-1 text-xs text-text-muted">از صفحه جزئیات هر سمینار</p>
            </div>
            <div className="card p-4">
              <Trophy size={18} className="text-primary" />
              <p className="mt-3 text-sm font-bold text-text">گواهی حضور</p>
              <p className="mt-1 text-xs text-text-muted">پس از تأیید حضور</p>
            </div>
          </div>

          {active && (
            <Link href={`/panel/seminars/${active.id}`} className="card flex flex-col gap-4 p-5 transition hover:border-primary/50 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-primary">سمینار فعال</p>
                <h2 className="mt-1 text-base font-bold text-text">{active.title}</h2>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
                  {active.location && <span className="inline-flex items-center gap-1"><MapPin size={14} />{active.location}</span>}
                  {active.date && <span>{new Date(active.date).toLocaleDateString('fa-IR')}</span>}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                مشاهده جزئیات
                <ChevronLeft className="h-4 w-4" />
              </span>
            </Link>
          )}

          <div className="card divide-y divide-border">
            {seminars.map((seminar) => (
              <Link key={seminar.id} href={`/panel/seminars/${seminar.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-surface-soft">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text">{seminar.title}</p>
                  {seminar.location ? <p className="mt-1 text-xs text-text-muted">{seminar.location}</p> : null}
                </div>
                {seminar.date ? <span className="shrink-0 text-xs text-text-muted">{new Date(seminar.date).toLocaleDateString('fa-IR')}</span> : null}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
