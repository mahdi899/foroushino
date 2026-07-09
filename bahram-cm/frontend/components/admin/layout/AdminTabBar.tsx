'use client';

import { cn } from '@/lib/utils';

export function AdminTabBar({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: Array<{ id: string; label: string; icon?: React.ReactNode; badge?: number }>;
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('admin-tab-bar -mx-1 mb-6', className)}>
      <div className="admin-tab-bar__scroll flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface-soft p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'admin-tab-bar__btn relative inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-small font-medium transition',
              active === tab.id
                ? 'bg-surface text-text shadow-soft'
                : 'text-text-muted hover:bg-surface/60 hover:text-text',
            )}
          >
            {tab.icon}
            <span className="whitespace-nowrap">{tab.label}</span>
            {tab.badge != null && tab.badge > 0 ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 admin-text-caption font-bold text-white">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AdminUnderlineTabBar({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: Array<{ id: string; label: string; badge?: number }>;
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('admin-underline-tab-bar -mx-1 mb-6 border-b border-border', className)}>
      <div className="admin-underline-tab-bar__scroll flex gap-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative shrink-0 border-b-2 px-4 py-2.5 text-small font-medium transition-colors',
              active === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 ? (
              <span className="absolute -left-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 admin-text-caption font-bold text-white">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
