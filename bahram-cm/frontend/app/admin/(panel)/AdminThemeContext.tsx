'use client';

import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';

export type AdminTheme = 'light' | 'dark';

interface AdminThemeContextValue {
  theme: AdminTheme;
  sidebarCollapsed: boolean;
  mounted: boolean;
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
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readSidebar(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SIDEBAR_KEY) === '1';
}

function applyThemeToRoot(theme: AdminTheme) {
  document.getElementById('admin-root')?.setAttribute('data-admin-theme', theme);
}

function applySidebarToRoot(collapsed: boolean) {
  const root = document.getElementById('admin-root');
  if (!root) return;
  if (collapsed) root.setAttribute('data-sidebar-collapsed', '1');
  else root.removeAttribute('data-sidebar-collapsed');
}

export function AdminThemeBoot() {
  useLayoutEffect(() => {
    applyThemeToRoot(readTheme());
    applySidebarToRoot(readSidebar());
  }, []);

  return null;
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>('light');
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    const initialTheme = readTheme();
    const initialSidebar = readSidebar();
    setThemeState(initialTheme);
    setSidebarCollapsedState(initialSidebar);
    applyThemeToRoot(initialTheme);
    applySidebarToRoot(initialSidebar);
    document.documentElement.removeAttribute('data-admin-theme');
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;
    applyThemeToRoot(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, mounted]);

  useLayoutEffect(() => {
    if (!mounted) return;
    applySidebarToRoot(sidebarCollapsed);
    localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed, mounted]);

  const value = useMemo(
    () => ({
      theme,
      sidebarCollapsed,
      mounted,
      setTheme: setThemeState,
      toggleTheme: () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
      setSidebarCollapsed: setSidebarCollapsedState,
      toggleSidebar: () => setSidebarCollapsedState((v) => !v),
    }),
    [theme, sidebarCollapsed, mounted],
  );

  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>;
}

export function useAdminTheme() {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) throw new Error('useAdminTheme must be used within AdminThemeProvider');
  return ctx;
}
