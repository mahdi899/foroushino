'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminNav, isAdminNavActive } from './admin-nav';
import { BrandMark } from '@/components/layout/Header';
import { AdminLucideIcon } from '@/lib/admin/lucide-icons';
import { cn } from '@/lib/utils';
import { logoutAction } from '@/lib/auth/actions';
import { AdminFocusProvider, useAdminFocus } from './AdminFocusContext';
import { useAdminTheme } from './AdminThemeContext';
import { AdminThemeToggle } from './AdminThemeToggle';
import { OperatorQueueAlertProvider, useOperatorQueueAlert } from './OperatorQueueAlertContext';
import { AdminSaveBarProvider } from './AdminSaveBarContext';
import { AdminHeaderSaveBar } from './AdminHeaderSaveBar';

function NavIcon({ name, className }: { name: string; className?: string }) {
  return <AdminLucideIcon name={name} className={cn('h-[18px] w-[18px] shrink-0', className)} />;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminFocusProvider>
      <OperatorQueueAlertProvider>
        <AdminSaveBarProvider>
          <AdminShellInner>{children}</AdminShellInner>
        </AdminSaveBarProvider>
      </OperatorQueueAlertProvider>
    </AdminFocusProvider>
  );
}

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { focusMode, setFocusMode } = useAdminFocus();
  const { sidebarCollapsed, toggleSidebar } = useAdminTheme();
  const { pendingCount, ticketPendingCount } = useOperatorQueueAlert();

  const sidebarW = sidebarCollapsed ? 'w-[68px]' : 'w-64';
  const mainMr = sidebarCollapsed ? 'lg:mr-[68px]' : 'lg:mr-64';

  return (
    <div
      className={cn(
        'admin-shell bg-bg',
        focusMode && 'fixed inset-0 z-[60] flex h-dvh max-h-dvh flex-col overflow-hidden',
      )}
    >
      {!focusMode && (
        <aside
          className={cn(
            'admin-sidebar fixed inset-y-0 right-0 z-40 flex flex-col overflow-hidden border-l border-border bg-surface shadow-soft transition-transform lg:translate-x-0',
            sidebarW,
            mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
          )}
        >
          {/* Brand header */}
          <div className={cn('flex shrink-0 items-center border-b border-border', sidebarCollapsed ? 'justify-center p-3' : 'gap-2.5 p-4')}>
            <BrandMark />
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate font-extrabold text-primary-dark">پنل بهرام</p>
                <p className="text-caption text-text-muted">مدیریت محتوا</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="admin-sidebar-nav flex-1 overflow-y-auto overflow-x-hidden p-2">
            {adminNav.map((group) => (
              <div key={group.group} className="mb-3">
                {!sidebarCollapsed && (
                  <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    {group.group}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isAdminNavActive(pathname, item.href, item.matchPrefix);
                    const isChatbotNav = item.href === '/admin/chatbot';
                    const isTicketsNav = item.href === '/admin/academy/tickets';
                    const navAlertCount = isChatbotNav
                      ? pendingCount
                      : isTicketsNav
                        ? ticketPendingCount
                        : 0;
                    const showQueueAlert = navAlertCount > 0;
                    const isImportant = 'emphasis' in item && item.emphasis;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          title={sidebarCollapsed ? item.label : undefined}
                          data-active={active}
                          className={cn(
                            'admin-nav-item flex items-center rounded-lg text-small font-medium',
                            sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-2.5 py-2',
                            active ? '' : 'text-text hover:bg-surface-soft hover:text-primary',
                            showQueueAlert && 'admin-nav-queue-alert',
                            isImportant && 'admin-nav-important',
                          )}
                        >
                          <span className="relative shrink-0">
                            <NavIcon
                              name={item.icon}
                              className={cn('admin-nav-icon', active && 'text-inherit')}
                            />
                            {showQueueAlert && sidebarCollapsed && (
                              <span className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-surface" />
                            )}
                          </span>
                          {!sidebarCollapsed && (
                            <>
                              <span className="truncate">{item.label}</span>
                              {showQueueAlert && (
                                <span className="mr-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                                  {navAlertCount > 99 ? '99+' : navAlertCount}
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Sidebar footer controls */}
          <div className={cn('shrink-0 border-t border-border p-2', sidebarCollapsed ? 'flex flex-col items-center gap-1' : 'space-y-1')}>
            <button
              type="button"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? 'باز کردن منو' : 'جمع کردن منو'}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-caption text-text-muted transition hover:bg-surface-soft hover:text-primary"
            >
              {sidebarCollapsed ? (
                <AdminLucideIcon name="PanelRightOpen" className="h-4 w-4" strokeWidth={2} />
              ) : (
                <>
                  <AdminLucideIcon name="PanelRightClose" className="h-4 w-4" strokeWidth={2} />
                  <span>جمع کردن منو</span>
                </>
              )}
            </button>
          </div>
        </aside>
      )}

      <div className={cn('admin-main', focusMode ? 'min-w-0 flex-1' : mainMr)}>
        {!focusMode && (
          <header className="sticky top-0 z-30 flex h-14 shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-border bg-surface/90 px-3 backdrop-blur-md sm:gap-2 sm:px-4 lg:flex-nowrap lg:px-6">
            <div className="flex min-w-0 items-center gap-1 sm:gap-2">
              <button
                type="button"
                className="rounded-lg p-2 text-text-muted transition hover:bg-surface-soft hover:text-primary lg:hidden"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="منو"
              >
                <AdminLucideIcon name="Menu" className="h-5 w-5" strokeWidth={2} />
              </button>
              <button
                type="button"
                className="hidden rounded-lg p-2 text-text-muted transition hover:bg-surface-soft hover:text-primary lg:flex"
                onClick={toggleSidebar}
                aria-label="جمع/باز کردن منو"
              >
                <AdminLucideIcon
                  name="PanelRightClose"
                  className={cn('h-5 w-5 transition', sidebarCollapsed && 'rotate-180')}
                  strokeWidth={2}
                />
              </button>
            </div>
            <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-3">
              <div className="admin-header-user-chip flex items-center gap-1.5 rounded-pill p-0.5">
                <AdminThemeToggle />
              </div>
              <Link
                href="/"
                target="_blank"
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-caption text-text-muted transition hover:bg-surface-soft hover:text-primary sm:px-2.5"
              >
                <AdminLucideIcon name="ExternalLink" className="h-3.5 w-3.5" strokeWidth={2} />
                <span className="hidden sm:inline">مشاهده سایت</span>
              </Link>
              <div className="flex items-center gap-1.5">
                <form action={logoutAction}>
                  <button type="submit" className="btn btn-secondary px-2.5 py-1.5 text-caption sm:px-3">
                    <AdminLucideIcon name="LogOut" className="h-3.5 w-3.5" strokeWidth={2} />
                    <span className="hidden sm:inline">خروج</span>
                  </button>
                </form>
                <AdminHeaderSaveBar />
              </div>
            </div>
          </header>
        )}

        {focusMode && (
          <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-border bg-surface/95 px-3 py-2 backdrop-blur sm:px-4">
            <p className="text-small font-semibold text-primary-dark">حالت فوکوس — ویرایش مقاله</p>
            <button type="button" onClick={() => setFocusMode(false)} className="btn btn-secondary px-3 py-1.5 text-small">
              <AdminLucideIcon name="Minimize2" className="h-4 w-4" strokeWidth={2} />
              خروج از فوکوس
            </button>
          </div>
        )}

        <div className={cn('admin-main-scroll p-3 sm:p-4 lg:p-7', focusMode && 'lg:p-6')}>{children}</div>
      </div>

      {mobileOpen && !focusMode && (
        <div className="admin-overlay fixed inset-0 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </div>
  );
}
