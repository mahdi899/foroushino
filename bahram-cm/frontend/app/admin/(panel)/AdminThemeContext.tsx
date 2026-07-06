'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AdminTheme = 'light' | 'dark';

interface AdminThemeContextValue {
  theme: AdminTheme;
  sidebarCollapsed: boolean;
  setTheme: (theme: AdminTheme) => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebar: () => void;
}

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

const THEME_KEY = 'bahram-admin-theme';
const SIDEBAR_KEY = 'bahram-admin-sidebar';

function readTheme(): AdminTheme {
  if (typeof window === 'undefined') return 'light';
  const fromDom = document.getElementById('admin-root')?.getAttribute('data-admin-theme');
  if (fromDom === 'dark' || fromDom === 'light') return fromDom;
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

function readSidebar(): boolean {
  if (typeof window === 'undefined') return false;
  const fromDom = document.getElementById('admin-root')?.getAttribute('data-sidebar-collapsed');
  if (fromDom === '1') return true;
  return localStorage.getItem(SIDEBAR_KEY) === '1';
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>(readTheme);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(readSidebar);

  useEffect(() => {
    const root = document.getElementById('admin-root');
    root?.setAttribute('data-admin-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.removeAttribute('data-admin-theme');
  }, []);

  useEffect(() => {
    const root = document.getElementById('admin-root');
    if (sidebarCollapsed) {
      root?.setAttribute('data-sidebar-collapsed', '1');
    } else {
      root?.removeAttribute('data-sidebar-collapsed');
    }
    localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  const value = useMemo(
    () => ({
      theme,
      sidebarCollapsed,
      setTheme: setThemeState,
      toggleTheme: () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
      setSidebarCollapsed: setSidebarCollapsedState,
      toggleSidebar: () => setSidebarCollapsedState((v) => !v),
    }),
    [theme, sidebarCollapsed],
  );

  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>;
}

export function useAdminTheme() {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) throw new Error('useAdminTheme must be used within AdminThemeProvider');
  return ctx;
}
