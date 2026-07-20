'use client';

import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useDataTheme } from '@/lib/useDataTheme';
import { applyResolvedTheme, type SiteTheme } from '@/lib/site-theme';

/** Compact sun/moon control — matches family topbar action buttons. */
export function ThemeIconButton({ className }: { className?: string }) {
  const theme = useDataTheme();
  const isLight = theme === 'light';
  const Icon = isLight ? Moon : Sun;

  const toggle = () => {
    const next: SiteTheme = isLight ? 'dark' : 'light';
    applyResolvedTheme(next);
  };

  return (
    <button
      type="button"
      aria-label={isLight ? 'تغییر به حالت تاریک' : 'تغییر به حالت روشن'}
      aria-pressed={isLight}
      title={isLight ? 'حالت تاریک' : 'حالت روشن'}
      onClick={toggle}
      className={cn('family-topbar__action', className)}
    >
      <Icon className="family-topbar__action-icon" strokeWidth={1.85} aria-hidden />
    </button>
  );
}
