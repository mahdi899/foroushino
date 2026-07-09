import { cn } from '@/lib/utils';

export type AdminTableCardField = {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
};

export function AdminTableCard({
  title,
  fields,
  footer,
  leading,
  expanded,
  className,
  onClick,
}: {
  title?: React.ReactNode;
  fields: AdminTableCardField[];
  footer?: React.ReactNode;
  leading?: React.ReactNode;
  expanded?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <article
      className={cn(
        'admin-table-card card overflow-hidden',
        onClick && 'cursor-pointer transition hover:border-accent/40',
        className,
      )}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start gap-3 p-4">
        {leading ? <div className="shrink-0 pt-0.5">{leading}</div> : null}
        <div className="min-w-0 flex-1 space-y-3">
          {title ? <div className="admin-card-title">{title}</div> : null}
          <dl className="grid gap-2.5">
            {fields.map((field) => (
              <div key={field.label} className="flex items-start justify-between gap-3">
                <dt className="admin-text-meta shrink-0 text-text-muted">{field.label}</dt>
                <dd
                  className={cn(
                    'admin-text-body min-w-0 text-end font-medium text-text',
                    field.mono && 'font-mono admin-text-meta',
                  )}
                >
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
          {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">{footer}</div> : null}
        </div>
      </div>
      {expanded ? <div className="border-t border-border bg-surface-soft/40 p-4">{expanded}</div> : null}
    </article>
  );
}

export function AdminTableCardList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('admin-table-card-list space-y-3 md:hidden', className)}>{children}</div>;
}
