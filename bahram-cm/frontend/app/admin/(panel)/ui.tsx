import Link from 'next/link';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminPage({
  title,
  desc,
  action,
  children,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-5 border-b border-border pb-4 sm:mb-6 sm:pb-5">
        <div className="grid gap-3 sm:grid-cols-2 sm:items-end sm:gap-4">
          <div className="min-w-0 text-end sm:col-start-1 sm:row-start-1">
            <h1 className="text-h3 font-extrabold text-primary-dark sm:text-h2">{title}</h1>
            {desc && <p className="mt-1 text-caption text-text-muted sm:mt-1.5 sm:text-small">{desc}</p>}
          </div>
          {action ? (
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:col-start-2 sm:row-start-1 sm:justify-self-end">
              {action}
            </div>
          ) : null}
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function StatCard({ label, value, icon, hint }: { label: string; value: string | number; icon: string; hint?: string }) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[icon] ?? Icons.Circle;
  return (
    <div className="card flex min-w-0 items-center gap-3 p-4 sm:gap-4 sm:p-5">
      <span className="grid h-12 w-12 place-items-center rounded-lg bg-surface-soft text-accent">
        <Cmp className="h-6 w-6" strokeWidth={1.5} />
      </span>
      <div>
        <p className="text-small text-text-muted">{label}</p>
        <p className="text-h2 font-extrabold leading-tight text-primary-dark">{value}</p>
        {hint && <p className="text-caption text-text-muted">{hint}</p>}
      </div>
    </div>
  );
}

export function PersistNotice() {
  return (
    <div className="mb-5 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-caption text-text-muted">
      <Icons.Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      محتوای نمونه از لایه content بارگذاری می‌شود. در محیط تولید با MySQL، این مدیریت مستقیماً روی
      دیتابیس اعمال می‌شود (مدل‌های Prisma از قبل آماده‌اند).
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-right text-small">
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

export function Badge({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'success' | 'warning' | 'accent' }) {
  const tones = {
    default: 'bg-surface-soft text-text-muted',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    accent: 'bg-accent-soft text-accent',
  };
  return <span className={cn('inline-block rounded-pill px-2.5 py-0.5 text-caption font-medium', tones[tone])}>{children}</span>;
}

export function EditLink({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 font-medium text-accent hover:text-primary">
      <Icons.Pencil className="h-4 w-4" /> ویرایش
    </Link>
  );
}
