import type { Metadata } from 'next';
import { CheckCircle2, Clock, FileText, Trophy, XCircle } from 'lucide-react';
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

const STATUS: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  received: { label: 'دریافت‌شده', icon: Clock, className: 'bg-yellow-500/10 text-yellow-600' },
  reviewing: { label: 'در حال بررسی', icon: Clock, className: 'bg-blue-500/10 text-blue-600' },
  accepted: { label: 'پذیرفته‌شده', icon: CheckCircle2, className: 'bg-green-500/10 text-green-600' },
  rejected: { label: 'رد شده', icon: XCircle, className: 'bg-red-500/10 text-red-600' },
};

export default async function PanelSatPage() {
  const [user, { data: application }] = await Promise.all([
    getCurrentStudent(),
    studentFetch<{ data: SatApplication | null }>('/sat-application'),
  ]);
  const status = application ? (STATUS[application.status] ?? STATUS.received) : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Trophy size={22} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-text">سات</h1>
          <p className="text-sm text-text-muted">درخواست همکاری با آکادمی</p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-bold text-text">مراحل بررسی</h2>
        <ol className="space-y-3">
          {['ثبت درخواست', 'بررسی تیم آکادمی', 'اعلام نتیجه'].map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
              <div>
                <p className="text-sm font-semibold text-text">{step}</p>
                <p className="text-xs text-text-muted">در این مرحله وضعیت از طریق پنل و پیامک اطلاع‌رسانی می‌شود.</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {application ? (
        <div className="card p-6">
          <p className="mb-3 text-sm text-text-muted">وضعیت درخواست شما:</p>
          {status && (
            <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${status.className}`}>
              <status.icon size={18} />
              {status.label}
            </div>
          )}
          {application.submitted_at && <p className="mt-3 text-xs text-text-muted">ثبت شده در {new Date(application.submitted_at).toLocaleDateString('fa-IR')}</p>}
        </div>
      ) : (
        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-text">
            <FileText size={16} className="text-primary" />
            فرم درخواست همکاری
          </h2>
          <SatApplicationForm mobile={user?.mobile ?? ''} />
        </div>
      )}

      <div className="card relative overflow-hidden p-5">
        <h3 className="text-sm font-bold text-text">چرا سات؟</h3>
        <p className="mt-2 text-xs leading-relaxed text-text-muted">
          سات مسیر همکاری با آکادمی است؛ برای افرادی که می‌خواهند در رشد آموزش و جامعه دانشجویی نقش فعال داشته باشند.
        </p>
        <div className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-primary/10 blur-3xl" />
      </div>
    </div>
  );
}
