import { Sparkles } from 'lucide-react';
import { SiteImage } from '@/components/ui/SiteImage';
import { ProgressBar } from '@/components/student-panel/ui/ProgressBar';
import { sitePhotos } from '@/lib/site-photo-paths';

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
    <section className="panel-welcome panel-glass relative overflow-hidden p-4 text-right sm:p-5 lg:p-6">
      <div className="panel-welcome__media" aria-hidden>
        <SiteImage
          src={sitePhotos.academyStory}
          alt="تصویر آکادمی بهرام"
          fill
          className="object-cover object-center"
          sizes="(max-width: 639px) 0px, 390px"
        />
      </div>

      <div className="panel-welcome__content relative z-10 max-w-2xl">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/20 shadow-glow"
            style={{ background: 'var(--color-gold-soft)' }}
          >
            <Sparkles size={22} style={{ color: 'var(--color-gold)' }} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-snug text-text sm:text-xl lg:text-2xl">
              سلام، به پنل آکادمی خوش اومدی
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              {name ? `${name} عزیز، ` : ''}
              از اینجا مسیر یادگیری، پشتیبانی و باشگاه مشتریان را یک‌جا مدیریت می‌کنی.
            </p>
          </div>
        </div>
        <div className="mt-5 max-w-md">
          <ProgressBar
            value={progress}
            label="پیشرفت شروع مسیر"
            sublabel={`${doneCount.toLocaleString('fa-IR')} از ${totalCount.toLocaleString('fa-IR')} مرحله`}
          />
        </div>
      </div>

      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
      <div
        className="absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-60 blur-3xl"
        style={{ background: 'rgba(255,183,3,0.08)' }}
      />
    </section>
  );
}
