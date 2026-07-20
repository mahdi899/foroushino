'use client';

import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';
import {
  applyResolvedTheme,
  bootstrapSiteTheme,
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
    const cleanup = bootstrapSiteTheme();
    document.documentElement.setAttribute('data-theme-ready', '1');
    return cleanup;
  }, []);

  return null;
}

export function PanelThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<PanelTheme>('dark');
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    const cleanup = bootstrapSiteTheme();
    setTheme(readResolvedTheme());
    setMounted(true);

    const obs = new MutationObserver(() => {
      const next = document.documentElement.getAttribute('data-theme');
      if (next === 'light' || next === 'dark') setTheme(next);
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      cleanup();
      obs.disconnect();
    };
  }, []);

  const value = useMemo(
    () => ({
      theme,
      mounted,
      toggleTheme: () => {
        setTheme((current) => {
          const next: PanelTheme = current === 'dark' ? 'light' : 'dark';
          applyResolvedTheme(next);
          return next;
        });
      },
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
