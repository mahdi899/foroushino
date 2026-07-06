'use client';

import { Moon, Sun } from 'lucide-react';
import { useAdminTheme } from './AdminThemeContext';
import { cn } from '@/lib/utils';

export function AdminThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, mounted } = useAdminTheme();
  const isDark = theme === 'dark';

  if (!mounted) {
    return (
      <span
        aria-hidden
        className={cn('admin-theme-toggle admin-theme-toggle-placeholder', className)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'تغییر به حالت روشن' : 'تغییر به حالت تاریک'}
      aria-pressed={!isDark}
      title={isDark ? 'حالت روشن' : 'حالت تاریک'}
      className={cn('admin-theme-toggle', className)}
    >
      <span aria-hidden className="admin-theme-toggle-track" dir="ltr">
        <Sun
          className={cn(
            'admin-theme-toggle-icon admin-theme-toggle-icon-sun',
            !isDark && 'admin-theme-toggle-icon-active',
          )}
          strokeWidth={1.75}
        />
        <Moon
          className={cn(
            'admin-theme-toggle-icon admin-theme-toggle-icon-moon',
            isDark && 'admin-theme-toggle-icon-active',
          )}
          strokeWidth={1.75}
        />
        <span
          aria-hidden
          className={cn('admin-theme-toggle-thumb', isDark && 'admin-theme-toggle-thumb-dark')}
        >
          {isDark ? (
            <Moon className="h-3.5 w-3.5" strokeWidth={2} fill="currentColor" fillOpacity={0.15} />
          ) : (
            <Sun className="h-3.5 w-3.5" strokeWidth={2} fill="currentColor" fillOpacity={0.2} />
          )}
        </span>
      </span>
    </button>
  );
}
