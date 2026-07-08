'use client';

import { Moon, Sun } from 'lucide-react';
import { usePanelTheme } from './PanelThemeContext';

export function PanelThemeToggle() {
  const { theme, mounted, toggleTheme } = usePanelTheme();
  const isDark = theme === 'dark';

  if (!mounted) {
    return <span aria-hidden className="panel-theme-toggle panel-theme-toggle-placeholder" />;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="panel-theme-toggle"
      aria-label="تغییر حالت روشن/تیره"
      aria-pressed={isDark}
    >
      <span className={`panel-theme-toggle-thumb${isDark ? ' panel-theme-toggle-thumb-dark' : ''}`}>
        {isDark ? <Moon size={14} /> : <Sun size={14} />}
      </span>
    </button>
  );
}
