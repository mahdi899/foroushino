'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminBottomNav } from '@/components/admin/layout/AdminBottomNav';
import { AdminHeader } from '@/components/admin/layout/AdminHeader';
import { AdminMobileMenu } from '@/components/admin/layout/AdminMobileMenu';
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar';
import { cn } from '@/lib/utils';
import { adminNav, filterAdminNav } from './admin-nav';
import { AdminFocusProvider, useAdminFocus } from './AdminFocusContext';
import { useAdminTheme } from './AdminThemeContext';
import { OperatorQueueAlertProvider, useOperatorQueueAlert } from './OperatorQueueAlertContext';
import { AdminSaveBarProvider } from './AdminSaveBarContext';

export function AdminShell({
  children,
  permissions = [],
  isSuperAdmin = false,
}: {
  children: React.ReactNode;
  permissions?: string[];
  isSuperAdmin?: boolean;
}) {
  return (
    <AdminFocusProvider>
      <OperatorQueueAlertProvider>
        <AdminSaveBarProvider>
          <AdminShellInner permissions={permissions} isSuperAdmin={isSuperAdmin}>
            {children}
          </AdminShellInner>
        </AdminSaveBarProvider>
      </OperatorQueueAlertProvider>
    </AdminFocusProvider>
  );
}

function AdminShellInner({
  children,
  permissions,
  isSuperAdmin,
}: {
  children: React.ReactNode;
  permissions: string[];
  isSuperAdmin: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { focusMode } = useAdminFocus();
  const { sidebarCollapsed, toggleSidebar } = useAdminTheme();
  const { pendingCount, ticketPendingCount } = useOperatorQueueAlert();

  const nav = useMemo(
    () => filterAdminNav(adminNav, { permissions, isSuperAdmin }),
    [permissions, isSuperAdmin],
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <div
      className={cn(
        'admin-shell bg-bg',
        focusMode && 'fixed inset-0 z-[60] flex h-dvh max-h-dvh flex-col overflow-hidden',
      )}
    >
      {!focusMode && (
        <>
          <AdminSidebar
            nav={nav}
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
            pendingCount={pendingCount}
            ticketPendingCount={ticketPendingCount}
          />
          <AdminMobileMenu
            nav={nav}
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            pendingCount={pendingCount}
            ticketPendingCount={ticketPendingCount}
          />
        </>
      )}

      <div className={cn('admin-main', focusMode && 'min-w-0 flex-1')}>
        {!focusMode && <AdminHeader />}

        <div className={cn('admin-main-scroll', focusMode && 'flex-1 lg:px-8 lg:pb-5 lg:pt-0')}>{children}</div>
      </div>

      {!focusMode && (
        <AdminBottomNav
          pendingCount={pendingCount}
          ticketPendingCount={ticketPendingCount}
          onMenuOpen={() => setMobileOpen(true)}
        />
      )}
    </div>
  );
}
