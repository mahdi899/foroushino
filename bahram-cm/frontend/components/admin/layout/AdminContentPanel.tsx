import { cn } from '@/lib/utils';

export function AdminContentPanel({
  title,
  summary,
  action,
  children,
  className,
}: {
  title: string;
  summary?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('admin-dashboard-panel admin-content-panel admin-content-panel--list', className)}>
      <div className="admin-dashboard-panel__head">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="admin-dashboard-panel__title">{title}</h2>
          {summary ? <span className="admin-content-panel__summary">{summary}</span> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="admin-content-panel__body">{children}</div>
    </section>
  );
}
