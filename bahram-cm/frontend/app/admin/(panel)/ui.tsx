import Link from 'next/link';
import { AdminPageHeader, type AdminPageHeaderVariant } from '@/components/admin/layout/AdminPageHeader';
import { AdminTableCardList } from '@/components/admin/layout/AdminTableCard';
import { AdminLucideIcon } from '@/lib/admin/lucide-icons';
import { cn } from '@/lib/utils';

export function AdminPage({
  title,
  desc,
  action,
  children,
  icon,
  headerVariant = 'default',
  stackHeader = false,
  compactHeader = false,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  icon?: string;
  headerVariant?: AdminPageHeaderVariant;
  /** Keep title and toolbar stacked (full width) — use on dense editor toolbars */
  stackHeader?: boolean;
  /** Single-line compact header — title and actions on one row */
  compactHeader?: boolean;
}) {
  return (
    <div className="min-w-0">
      <AdminPageHeader
        icon={icon}
        title={title}
        description={desc}
        variant={headerVariant}
        compact={compactHeader}
        action={action}
        className={cn(
          !compactHeader && (stackHeader ? 'mb-5 sm:mb-5' : 'mb-5 sm:mb-6'),
          !compactHeader && stackHeader && 'flex-col gap-3',
        )}
      />
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
  tone = 'teal',
}: {
  label: string;
  value: string | number;
  icon: string;
  hint?: string;
  href?: string;
  tone?: 'teal' | 'gold' | 'blue' | 'green' | 'amber';
}) {
  const content = (
    <div
      className={cn(
        'admin-stat-card flex min-w-0 w-full items-stretch gap-3 p-3.5 sm:gap-3.5 sm:p-4',
        `admin-stat-card--${tone}`,
        href && 'admin-stat-card--link',
      )}
    >
      <span className={cn('admin-stat-card__icon', `admin-stat-card__icon--${tone}`)}>
        <AdminLucideIcon name={icon} className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
      </span>
      <div className="admin-stat-card__body">
        <p className="admin-stat-card__label">{label}</p>
        <p className="admin-stat-card__value">{value}</p>
        <p className="admin-stat-card__hint">{hint ?? '\u00a0'}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="admin-stat-card-link">
        {content}
      </Link>
    );
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

export function Table({
  head,
  children,
  mobile,
}: {
  head: string[];
  children: React.ReactNode;
  /** Card list for viewports below `md` — avoids horizontal scroll */
  mobile?: React.ReactNode;
}) {
  return (
    <>
      {mobile ? <AdminTableCardList>{mobile}</AdminTableCardList> : null}
      <div
        className={cn(
          'overflow-x-auto rounded-lg border border-border bg-surface',
          mobile && 'hidden md:block',
        )}
      >
        <table className="admin-text-body w-full min-w-[32rem] text-right">
          <thead>
            <tr className="border-b border-border bg-surface-soft/60 text-text-muted">
              {head.map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
      </div>
    </>
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
