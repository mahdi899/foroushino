'use client';

import { Moon, Sun } from 'lucide-react';
import { usePanelTheme } from '@/app/panel/PanelThemeContext';

export function PanelThemeToggle() {
  const { theme, mounted, toggleTheme } = usePanelTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="panel-theme-toggle"
      aria-label="تغییر حالت روشن/تیره"
      aria-pressed={isDark}
      style={!mounted ? { pointerEvents: 'none', opacity: 0.55 } : undefined}
    >
      <span className={`panel-theme-toggle-thumb${isDark ? ' panel-theme-toggle-thumb-dark' : ''}`}>
        {isDark ? <Moon size={14} /> : <Sun size={14} />}
      </span>
    </button>
  );
}
