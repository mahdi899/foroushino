import Link from 'next/link';
import { AdminLucideIcon } from '@/lib/admin/lucide-icons';
import { cn } from '@/lib/utils';

export function AdminPage({
  title,
  desc,
  action,
  children,
  stackHeader = false,
  compactHeader = false,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  /** Keep title and toolbar stacked (full width) — use on dense editor toolbars */
  stackHeader?: boolean;
  /** Single-line compact header — title and actions on one row */
  compactHeader?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div
        className={cn(
          compactHeader
            ? 'mb-5 flex min-w-0 items-center justify-between gap-2 overflow-x-auto border-b border-border pb-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:mb-4 sm:pb-3 [&::-webkit-scrollbar]:hidden'
            : cn(
                'admin-page-header',
                stackHeader ? 'flex-col gap-3 sm:mb-5' : 'flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4 sm:mb-6',
              ),
        )}
      >
        <div
          className={cn(
            compactHeader
              ? 'flex min-w-0 shrink-0 items-center gap-2'
              : cn(
                  'admin-page-header__body min-w-0 w-full text-start',
                  !stackHeader && 'lg:flex-1',
                ),
          )}
        >
          <h1
            className={cn(
              compactHeader
                ? 'whitespace-nowrap text-base font-extrabold text-text'
                : 'admin-page-header__title text-h3 font-extrabold sm:text-h2',
            )}
          >
            {title}
          </h1>
          {desc && (
            <p
              className={cn(
                compactHeader
                  ? 'admin-section-subtitle hidden min-w-0 truncate md:block md:max-w-[14rem] lg:max-w-xs xl:max-w-sm'
                  : 'admin-page-header__desc admin-section-subtitle mt-1 sm:mt-1.5',
              )}
            >
              {desc}
            </p>
          )}
        </div>
        {action ? (
          <div
            className={cn(
              'admin-page-header__actions flex min-w-0 shrink-0 items-center',
              !compactHeader && 'w-full max-w-full flex-col gap-2',
              !compactHeader && !stackHeader && 'lg:w-auto lg:max-w-[min(100%,40rem)] lg:items-end',
              !compactHeader && stackHeader && 'shrink-0',
            )}
          >
            {action}
          </div>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  icon: string;
  hint?: string;
  href?: string;
}) {
  const content = (
    <div className={cn('card flex min-w-0 items-center gap-3 p-4 sm:gap-4 sm:p-5', href && 'transition hover:border-accent')}>
      <span className="grid h-12 w-12 place-items-center rounded-lg bg-surface-soft text-accent">
        <AdminLucideIcon name={icon} className="h-6 w-6" strokeWidth={1.5} />
      </span>
      <div>
        <p className="admin-text-meta text-text-muted">{label}</p>
        <p className="text-h2 font-extrabold leading-tight text-text">{value}</p>
        {hint && <p className="admin-card-text">{hint}</p>}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export function PersistNotice() {
  return (
    <div className="admin-card-text mb-5 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
      <AdminLucideIcon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2} />
      محتوای نمونه از لایه content بارگذاری می‌شود. در محیط تولید با MySQL، این مدیریت مستقیماً روی
      دیتابیس اعمال می‌شود (مدل‌های Prisma از قبل آماده‌اند).
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="admin-text-body w-full min-w-[32rem] text-right">
        <thead>
          <tr className="border-b border-border bg-surface-soft/60 text-text-muted">
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function Badge({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'success' | 'warning' | 'accent' | 'danger' }) {
  const tones = {
    default: 'bg-surface-soft text-text-muted',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    accent: 'bg-accent-soft text-accent',
    danger: 'bg-danger/10 text-danger',
  };
  return <span className={cn('admin-text-meta inline-block rounded-pill px-2.5 py-0.5 font-medium', tones[tone])}>{children}</span>;
}

export function EditLink({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 font-medium text-accent hover:text-primary">
      <AdminLucideIcon name="Pencil" className="h-4 w-4" strokeWidth={2} /> ویرایش
    </Link>
  );
}
