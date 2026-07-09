'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react';
import { AppDownloadCard } from '@/components/student-panel/ui/AppDownloadCard';
import { cn } from '@/lib/cn';
import { PanelNavLabel } from './PanelNavLabel';
import { PANEL_NAV_ITEMS } from './panelNav';

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
  const isDesktopCollapsed = collapsed && !mobileOpen;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <>
      {mobileOpen ? (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} aria-hidden />
      ) : null}

      <aside
        className={cn(
          'panel-sidebar fixed inset-y-0 right-0 z-40 shrink-0 border-l transition-transform duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
          mobileOpen || !collapsed
            ? 'panel-sidebar--expanded w-64 p-4'
            : 'panel-sidebar--collapsed w-[4.5rem] p-2',
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
              {PANEL_NAV_ITEMS.map((item) => {
                const { href, label, icon: Icon, exact } = item;
                const active = isActive(href, exact);
                const showBadge = href === '/panel/notifications' && unreadCount > 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    title={isDesktopCollapsed ? label : undefined}
                    data-active={active}
                    className="panel-nav-item relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text transition-all duration-300"
                  >
                    <Icon size={18} className="shrink-0" />
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
