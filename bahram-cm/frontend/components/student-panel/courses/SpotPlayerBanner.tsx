import Link from 'next/link';
import { Play } from 'lucide-react';

export function SpotPlayerBanner({
  courseId,
  isActive,
  hasLicense,
}: {
  courseId: number;
  isActive: boolean;
  hasLicense: boolean;
}) {
  return (
    <div className="border-t border-border p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/20 to-accent/5 shadow-glow">
            <svg className="h-9 w-9 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5V19L19 12L8 5Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="panel-text-caption font-semibold uppercase tracking-wider text-primary">SpotPlayer</p>
            <h3 className="mt-0.5 text-lg font-bold text-text">پلیر اختصاصی دوره</h3>
            <p className="panel-text-meta mt-1 max-w-md leading-relaxed text-text-muted">
              تمام محتوای این دوره در اسپات‌پلیر قابل مشاهده است. برای شروع، روی دکمه زیر کلیک کنید.
            </p>
          </div>
        </div>

        {isActive && hasLicense ? (
          <Link href={`/panel/courses/${courseId}/watch`} className="btn btn-primary w-full sm:w-auto">
            <Play size={16} className="fill-current" />
            ورود به SpotPlayer
          </Link>
        ) : (
          <span className="panel-text-meta rounded-xl border border-border/40 bg-surface-soft px-4 py-2.5 text-center text-text-muted">
            لینک دوره به‌زودی فعال می‌شود.
          </span>
        )}
      </div>
    </div>
  );
}
