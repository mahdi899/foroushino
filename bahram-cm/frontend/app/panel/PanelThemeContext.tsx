'use client';

import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';

export type PanelTheme = 'light' | 'dark';

interface PanelThemeContextValue {
  theme: PanelTheme;
  mounted: boolean;
  toggleTheme: () => void;
}

const PanelThemeContext = createContext<PanelThemeContextValue | null>(null);

const THEME_KEY = 'bahram-panel-theme';

function readTheme(): PanelTheme {
  if (typeof window === 'undefined') return 'light';
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

function applyThemeToRoot(theme: PanelTheme) {
  document.getElementById('panel-root')?.setAttribute('data-panel-theme', theme);
}

export function PanelThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<PanelTheme>('light');
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    const initial = readTheme();
    setTheme(initial);
    applyThemeToRoot(initial);
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;
    applyThemeToRoot(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, mounted]);

  const value = useMemo(
    () => ({
      theme,
      mounted,
      toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    }),
    [theme, mounted],
  );

  return <PanelThemeContext.Provider value={value}>{children}</PanelThemeContext.Provider>;
}

export function usePanelTheme() {
  const ctx = useContext(PanelThemeContext);
  if (!ctx) throw new Error('usePanelTheme must be used within PanelThemeProvider');
  return ctx;
}
