'use client';

import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';
import {
  applyResolvedTheme,
  readResolvedTheme,
  type SiteTheme,
} from '@/lib/site-theme';

export type PanelTheme = SiteTheme;

interface PanelThemeContextValue {
  theme: PanelTheme;
  mounted: boolean;
  toggleTheme: () => void;
}

const PanelThemeContext = createContext<PanelThemeContextValue | null>(null);

export function PanelThemeBoot() {
  useLayoutEffect(() => {
    applyResolvedTheme(readResolvedTheme());
    document.documentElement.setAttribute('data-theme-ready', '1');
  }, []);

  return null;
}

export function PanelThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<PanelTheme>('dark');
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    const initial = readResolvedTheme();
    setTheme(initial);
    applyResolvedTheme(initial);
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;
    applyResolvedTheme(theme);
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
