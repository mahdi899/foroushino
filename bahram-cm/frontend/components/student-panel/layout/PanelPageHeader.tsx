import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type PanelPageHeaderVariant = 'default' | 'notifications' | 'support' | 'profile' | 'referrals';

export function PanelPageHeader({
  icon: Icon,
  title,
  description,
  variant = 'default',
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  variant?: PanelPageHeaderVariant;
}) {
  return (
    <header className={cn('panel-page-header', variant !== 'default' && `panel-page-header--${variant}`)}>
      <span className="panel-page-header__icon">
        <Icon size={24} strokeWidth={2} />
      </span>
      <div>
        <h1 className="panel-page-header__title">{title}</h1>
        {description ? <p className="panel-page-header__desc">{description}</p> : null}
      </div>
    </header>
  );
}
