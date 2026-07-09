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
      className={cn('admin-theme-toggle', className)}
      aria-label="تغییر حالت روشن/تیره"
      aria-pressed={isDark}
    >
      <span className={cn('admin-theme-toggle-thumb', isDark && 'admin-theme-toggle-thumb-dark')}>
        {isDark ? <Moon size={14} /> : <Sun size={14} />}
      </span>
    </button>
  );
}
