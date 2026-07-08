'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import type { StudentUser } from '@/lib/student/session';
import { PanelThemeProvider } from '@/app/panel/PanelThemeContext';
import { PanelBottomNav } from './PanelBottomNav';
import { PanelHeader } from './PanelHeader';
import { PanelPwaRegistrar } from './PanelPwaRegistrar';
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarCollapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    getSidebarCollapsedSnapshot,
    () => false,
  );

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

  function toggleSidebarCollapsed() {
    setSidebarCollapsed(!sidebarCollapsed);
  }

  return (
    <PanelThemeProvider>
      <div className="panel-shell">
        <PanelPwaRegistrar />
        <PanelSidebar
          unreadCount={unreadCount}
          mobileOpen={mobileOpen}
          collapsed={sidebarCollapsed}
          onClose={() => setMobileOpen(false)}
          onToggleCollapse={toggleSidebarCollapsed}
        />

        <div className="panel-main flex flex-col">
          <PanelHeader user={user} unreadCount={unreadCount} onMenuOpen={() => setMobileOpen(true)} />
          <main className="panel-main-content">{children}</main>
        </div>

        <PanelBottomNav unreadCount={unreadCount} onMenuOpen={() => setMobileOpen(true)} />
      </div>
    </PanelThemeProvider>
  );
}
