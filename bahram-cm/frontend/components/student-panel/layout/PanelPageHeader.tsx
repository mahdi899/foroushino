import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export type PanelPageHeaderVariant = 'default' | 'notifications' | 'support' | 'profile' | 'referrals';

export function PanelPageHeader({
  icon: Icon,
  title,
  description,
  variant = 'default',
  backLink,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  variant?: PanelPageHeaderVariant;
  backLink?: { href: string; label: string };
}) {
  return (
    <header
      className={cn(
        'panel-page-header',
        variant !== 'default' && `panel-page-header--${variant}`,
        backLink && 'panel-page-header--with-back',
      )}
    >
      {backLink ? (
        <Link href={backLink.href} className="panel-page-header__back">
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          {backLink.label}
        </Link>
      ) : null}
      <div className="panel-page-header__row">
        <span className="panel-page-header__icon">
          <Icon size={24} strokeWidth={2} />
        </span>
        <div>
          <h1 className="panel-page-header__title">{title}</h1>
          {description ? <p className="panel-page-header__desc">{description}</p> : null}
        </div>
      </div>
    </header>
  );
}
