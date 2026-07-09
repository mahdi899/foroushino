'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, GraduationCap, X } from 'lucide-react';
import { AppDownloadCard } from '@/components/student-panel/ui/AppDownloadCard';
import { cn } from '@/lib/cn';
import { PanelNavLabel } from './PanelNavLabel';
import { PANEL_NAV_ITEMS } from './panelNav';

function useNavActive(pathname: string | null) {
  return (href: string, exact?: boolean): boolean =>
    exact ? pathname === href : pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
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
      ? 'panel-mobile-nav-tile'
      : 'panel-nav-item relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-text-muted transition-colors duration-200';

  return (
    <>
      {PANEL_NAV_ITEMS.map((item) => {
        const { href, label, shortLabel, icon: Icon, exact } = item;
        const active = isActive(href, exact);
        const showBadge = href === '/panel/notifications' && unreadCount > 0;
        const mobileLabel = shortLabel ?? label;

        if (variant === 'mobile') {
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              data-active={active}
              className={itemClass}
            >
              <span className="panel-mobile-nav-tile__icon-wrap">
                <span
                  className={cn(
                    'panel-mobile-nav-tile__icon',
                    active ? 'panel-mobile-nav-tile__icon--active' : '',
                  )}
                >
                  <Icon size={18} strokeWidth={2} aria-hidden />
                </span>
                {showBadge ? (
                  <span className="panel-mobile-nav-tile__badge">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </span>
              <span className="panel-mobile-nav-tile__label">{mobileLabel}</span>
            </Link>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            data-active={active}
            className={itemClass}
          >
            <Icon size={18} className="panel-nav-item__icon shrink-0" aria-hidden />
            <PanelNavLabel label={label} className="panel-nav-item__label flex-1" />
            {showBadge ? (
              <span
                className="panel-nav-item__badge rounded-full px-1.5 py-0.5 font-bold text-white"
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
              <p className="panel-text-meta text-text-muted">دسترسی سریع به بخش‌ها</p>
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

        <div className="panel-mobile-menu__body">
          <nav className="panel-mobile-nav-grid">
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
              <span className="panel-sidebar__brand-text truncate">
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
