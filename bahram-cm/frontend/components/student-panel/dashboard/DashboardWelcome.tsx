import { Sparkles } from 'lucide-react';
import { ProgressBar } from '@/components/student-panel/ui/ProgressBar';

export function DashboardWelcome({
  name,
  doneCount,
  totalCount,
  progress,
}: {
  name: string;
  doneCount: number;
  totalCount: number;
  progress: number;
}) {
  return (
    <section className="panel-glass relative overflow-hidden p-4 text-right sm:p-5 lg:p-6">
      <div className="relative z-10 w-full max-w-2xl">
        <div className="flex flex-wrap items-start gap-2">
          <h1 className="text-lg font-bold leading-snug text-text sm:text-xl lg:text-2xl">
            سلام، به پنل آکادمی خوش اومدی 👋
          </h1>
          <Sparkles size={20} className="mt-1 shrink-0" style={{ color: 'var(--color-gold)' }} />
        </div>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          {name ? `${name} عزیز، ` : ''}
          از اینجا مسیر یادگیری، پشتیبانی و باشگاه مشتریان را یک‌جا مدیریت می‌کنی.
        </p>
        <div className="mt-5 max-w-md">
          <ProgressBar
            value={progress}
            label="پیشرفت شروع مسیر"
            sublabel={`${doneCount.toLocaleString('fa-IR')} از ${totalCount.toLocaleString('fa-IR')} مرحله`}
          />
        </div>
      </div>
      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-60 blur-3xl" style={{ background: 'rgba(255,183,3,0.08)' }} />
    </section>
  );
}
