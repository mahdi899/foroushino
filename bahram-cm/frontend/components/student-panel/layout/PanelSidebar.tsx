'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, GraduationCap, X } from 'lucide-react';
import { AppDownloadCard } from '@/components/student-panel/ui/AppDownloadCard';
import { cn } from '@/lib/cn';
import { PanelNavLabel } from './PanelNavLabel';
import { PANEL_NAV_ITEMS } from './panelNav';

function useNavActive(pathname: string | null) {
  return (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);
}

function PanelNavLinks({
  unreadCount,
  isActive,
  onNavigate,
  variant,
  collapsed = false,
}: {
  unreadCount: number;
  isActive: (href: string, exact?: boolean) => boolean;
  onNavigate?: () => void;
  variant: 'sidebar' | 'mobile';
  collapsed?: boolean;
}) {
  const itemClass =
    variant === 'mobile'
      ? 'panel-mobile-nav-item relative flex min-h-[3rem] items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-text transition-colors duration-200'
      : 'panel-nav-item relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text transition-all duration-300';

  return (
    <>
      {PANEL_NAV_ITEMS.map((item) => {
        const { href, label, icon: Icon, exact } = item;
        const active = isActive(href, exact);
        const showBadge = href === '/panel/notifications' && unreadCount > 0;

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            data-active={active}
            className={itemClass}
          >
            <span
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-transparent',
                active ? 'bg-primary/12 text-primary' : 'bg-surface-soft text-text-muted',
              )}
            >
              <Icon size={18} />
            </span>
            <PanelNavLabel label={label} className="panel-nav-item__label flex-1" />
            {showBadge ? (
              <span
                className="panel-nav-item__badge rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                style={{ background: 'var(--color-gold)' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </>
  );
}

export function PanelSidebar({
  unreadCount = 0,
  mobileOpen,
  collapsed,
  onClose,
  onToggleCollapse,
}: {
  unreadCount?: number;
  mobileOpen: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const isActive = useNavActive(pathname);
  const isDesktopCollapsed = collapsed && !mobileOpen;

  return (
    <>
      <div
        className={cn('panel-mobile-menu__scrim lg:hidden', mobileOpen && 'panel-mobile-menu__scrim--open')}
        onClick={onClose}
        aria-hidden={!mobileOpen}
      />

      <div
        className={cn('panel-mobile-menu lg:hidden', mobileOpen && 'panel-mobile-menu--open')}
        role="dialog"
        aria-modal="true"
        aria-label="منوی پنل"
        aria-hidden={!mobileOpen}
      >
        <div className="panel-mobile-menu__handle" aria-hidden />
        <div className="panel-mobile-menu__header">
          <div className="panel-mobile-menu__brand">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <GraduationCap size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text">منوی پنل</p>
              <p className="text-[11px] text-text-muted">دسترسی سریع به بخش‌ها</p>
            </div>
          </div>
          <button
            type="button"
            className="panel-mobile-menu__close"
            onClick={onClose}
            aria-label="بستن منو"
          >
            <X size={20} />
          </button>
        </div>

        <div className="panel-mobile-menu__scroll">
          <nav className="flex flex-col gap-1.5">
            <PanelNavLinks unreadCount={unreadCount} isActive={isActive} onNavigate={onClose} variant="mobile" />
          </nav>
        </div>

        <div className="panel-mobile-menu__footer">
          <AppDownloadCard minimal />
        </div>
      </div>

      <aside
        className={cn(
          'panel-sidebar fixed inset-y-0 right-0 z-40 shrink-0 border-l transition-transform duration-300',
          isDesktopCollapsed ? 'panel-sidebar--collapsed w-[4.5rem] p-2' : 'panel-sidebar--expanded w-64 p-4',
        )}
      >
        <div className="flex h-full flex-col">
          <div
            className={cn(
              'mb-4 flex items-center gap-2 px-1',
              isDesktopCollapsed ? 'flex-col' : 'justify-between',
            )}
          >
            <div className={cn('flex min-w-0 items-center gap-2.5', isDesktopCollapsed && 'justify-center')}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-glow">
                <GraduationCap size={20} />
              </div>
              <span className="panel-sidebar__brand-text truncate text-sm font-bold text-text sm:text-base">
                پنل آکادمی
              </span>
            </div>
            <div className={cn('flex items-center gap-1', isDesktopCollapsed && 'lg:mt-1')}>
              <button
                type="button"
                className="panel-sidebar__toggle hidden lg:inline-flex"
                onClick={onToggleCollapse}
                aria-label={collapsed ? 'باز کردن منو' : 'جمع کردن منو'}
                title={collapsed ? 'باز کردن منو' : 'جمع کردن منو'}
              >
                {collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              </button>
            </div>
          </div>

          <div className="panel-sidebar__scroll">
            <nav className="flex flex-col gap-1">
              <PanelNavLinks
                unreadCount={unreadCount}
                isActive={isActive}
                variant="sidebar"
                collapsed={isDesktopCollapsed}
              />
            </nav>
          </div>

          <div className="panel-sidebar__footer mt-4 shrink-0 space-y-2">
            <AppDownloadCard compact={isDesktopCollapsed} />
          </div>
        </div>
      </aside>
    </>
  );
}
