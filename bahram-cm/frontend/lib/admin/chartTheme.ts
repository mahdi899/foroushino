import { useMemo } from 'react';
import { useAdminTheme } from '@/app/admin/(panel)/AdminThemeContext';

export function useAdminChartTheme() {
  const { theme } = useAdminTheme();

  return useMemo(() => {
    const isDark = theme === 'dark';

    return {
      isDark,
      gridStroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
      tick: isDark ? '#9a9a9a' : '#5f7f83',
      tickStrong: isDark ? '#d4d4d4' : '#334155',
      colors: isDark
        ? ['#d4a574', '#e8c96a', '#5ecfaa', '#f0b429', '#f08070', '#a5b4fc', '#c9a227', '#94a3b8']
        : ['#008c96', '#25a0a6', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#c9a227', '#64748b'],
      barPrimary: isDark ? '#d4a574' : '#008c96',
      barSecondary: '#c9a227',
    };
  }, [theme]);
}
