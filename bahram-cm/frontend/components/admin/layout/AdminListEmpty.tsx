import { AdminLucideIcon } from '@/lib/admin/lucide-icons';
import { cn } from '@/lib/utils';

export function AdminListEmpty({
  icon = 'Inbox',
  title,
  description,
  action,
  className,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('admin-list-empty', className)}>
      <span className="admin-list-empty__icon">
        <AdminLucideIcon name={icon} className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <p className="admin-list-empty__title">{title}</p>
      {description ? <p className="admin-list-empty__desc">{description}</p> : null}
      {action ? <div className="admin-list-empty__action">{action}</div> : null}
    </div>
  );
}
