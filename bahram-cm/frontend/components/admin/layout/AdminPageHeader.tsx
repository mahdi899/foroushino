'use client';

import { AdminLucideIcon } from '@/lib/admin/lucide-icons';
import { cn } from '@/lib/utils';

export type AdminPageHeaderVariant =
  | 'default'
  | 'chatbot'
  | 'commerce'
  | 'media'
  | 'seo'
  | 'settings'
  | 'academy'
  | 'leads'
  | 'telegram';

export function AdminPageHeader({
  icon,
  title,
  description,
  variant = 'default',
  action,
  compact = false,
  className,
}: {
  icon?: string;
  title: string;
  description?: string;
  variant?: AdminPageHeaderVariant;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <div
        className={cn(
          'mb-5 flex min-w-0 items-center justify-between gap-2 overflow-x-auto border-b border-border pb-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:mb-4 sm:pb-3 [&::-webkit-scrollbar]:hidden',
          className,
        )}
      >
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          {icon ? (
            <span className="admin-page-header__icon admin-page-header__icon--compact grid h-9 w-9 shrink-0 place-items-center">
              <AdminLucideIcon name={icon} className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
          ) : null}
          <div className="min-w-0">
            <h1 className="whitespace-nowrap text-base font-extrabold text-text">{title}</h1>
            {description ? (
              <p className="admin-section-subtitle hidden min-w-0 truncate md:block md:max-w-[14rem] lg:max-w-xs xl:max-w-sm">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="flex min-w-0 shrink-0 items-center">{action}</div> : null}
      </div>
    );
  }

  return (
    <header
      className={cn(
        'admin-page-header',
        variant !== 'default' && `admin-page-header--${variant}`,
        action ? 'flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4' : undefined,
        className,
      )}
    >
      <div className={cn('admin-page-header__body flex min-w-0 items-start gap-3 text-start', action && 'lg:flex-1')}>
        {icon ? (
          <span className="admin-page-header__icon grid h-11 w-11 shrink-0 place-items-center sm:h-12 sm:w-12">
            <AdminLucideIcon name={icon} className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
          </span>
        ) : null}
        <div className="min-w-0 pt-0.5">
          <h1 className="admin-page-header__title text-h3 font-extrabold sm:text-h2">{title}</h1>
          {description ? <p className="admin-page-header__desc admin-section-subtitle mt-1 sm:mt-1.5">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="admin-page-header__actions flex w-full min-w-0 flex-col gap-2 lg:w-auto lg:max-w-[min(100%,40rem)] lg:items-end">{action}</div> : null}
    </header>
  );
}
