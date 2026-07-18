'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import type { StudentUser } from '@/lib/student/session';
import { PanelThemeProvider } from '@/app/panel/PanelThemeContext';
import { PanelNotificationProvider } from '@/components/student-panel/notifications/PanelNotificationContext';
import { PanelToastProvider } from '@/components/student-panel/ui/PanelToastContext';
import { PanelBottomNav } from './PanelBottomNav';
import { PanelAvatarCacheProvider } from './PanelAvatarCacheContext';
import { PanelHeader } from './PanelHeader';
import { PanelPwaRegistrar } from './PanelPwaRegistrar';
import { BahramUpdateBanner } from '@/components/pwa/BahramUpdateBanner';
import { PanelSidebar } from './PanelSidebar';

const SIDEBAR_COLLAPSED_KEY = 'panel-sidebar-collapsed';

const sidebarCollapseListeners = new Set<() => void>();

function subscribeSidebarCollapsed(onStoreChange: () => void) {
  sidebarCollapseListeners.add(onStoreChange);
  return () => sidebarCollapseListeners.delete(onStoreChange);
}

function getSidebarCollapsedSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function setSidebarCollapsed(value: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? '1' : '0');
  } catch {
    /* ignore */
  }
  sidebarCollapseListeners.forEach((listener) => listener());
}

export function PanelShell({
  user,
  unreadCount = 0,
  children,
}: {
  user: StudentUser;
  unreadCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [liveUnreadCount, setLiveUnreadCount] = useState(unreadCount);
  const sidebarCollapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    getSidebarCollapsedSnapshot,
    () => false,
  );

  useEffect(() => {
    setLiveUnreadCount(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    const root = document.getElementById('panel-root');
    if (!root) return;
    if (sidebarCollapsed) root.setAttribute('data-sidebar-collapsed', '1');
    else root.removeAttribute('data-sidebar-collapsed');
  }, [sidebarCollapsed]);

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

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    main.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setMobileOpen(false);
  }, [pathname]);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed(!sidebarCollapsed);
  }

  const handleUnreadCountChange = useCallback((count: number) => {
    setLiveUnreadCount(count);
  }, []);

  return (
    <PanelThemeProvider>
      <PanelToastProvider>
        <PanelAvatarCacheProvider>
        <PanelNotificationProvider initialUnreadCount={unreadCount} onUnreadCountChange={handleUnreadCountChange}>
        <div className="panel-shell">
          <PanelPwaRegistrar />
          <PanelSidebar
            unreadCount={liveUnreadCount}
            mobileOpen={mobileOpen}
            collapsed={sidebarCollapsed}
            onClose={() => setMobileOpen(false)}
            onToggleCollapse={toggleSidebarCollapsed}
          />

          <div className="panel-main flex min-w-0 flex-col">
            <PanelHeader
              user={user}
              unreadCount={liveUnreadCount}
            />
            <main ref={mainRef} className="panel-main-content">
              <div className="panel-page-wrap">{children}</div>
            </main>
          </div>

          <PanelBottomNav
            unreadCount={liveUnreadCount}
            menuOpen={mobileOpen}
            onMenuOpen={() => setMobileOpen(true)}
          />
          <BahramUpdateBanner variant="panel" />
        </div>
        </PanelNotificationProvider>
        </PanelAvatarCacheProvider>
      </PanelToastProvider>
    </PanelThemeProvider>
  );
}
