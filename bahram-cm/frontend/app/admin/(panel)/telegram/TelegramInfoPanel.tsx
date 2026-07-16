import { AdminLucideIcon } from '@/lib/admin/lucide-icons';
import { cn } from '@/lib/utils';

export function TelegramInfoPanel({
  icon,
  tone = 'blue',
  title,
  children,
}: {
  icon: string;
  tone?: 'blue' | 'teal' | 'green' | 'amber';
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('admin-telegram-info-panel', `admin-telegram-info-panel--${tone}`)}>
      <div className="admin-telegram-info-panel__head">
        <span className={cn('admin-telegram-info-panel__icon', `admin-telegram-info-panel__icon--${tone}`)}>
          <AdminLucideIcon name={icon} className="h-5 w-5" strokeWidth={2} />
        </span>
        <h3 className="admin-telegram-info-panel__title">{title}</h3>
      </div>
      <div className="admin-telegram-info-panel__body">{children}</div>
    </div>
  );
}

export function TelegramCodeList({ items }: { items: { code: string; hint: string }[] }) {
  return (
    <ul className="admin-telegram-code-list">
      {items.map((item) => (
        <li key={item.code} className="admin-telegram-code-list__item">
          <code className="admin-telegram-code-list__code">{item.code}</code>
          <span className="admin-telegram-code-list__hint">{item.hint}</span>
        </li>
      ))}
    </ul>
  );
}
