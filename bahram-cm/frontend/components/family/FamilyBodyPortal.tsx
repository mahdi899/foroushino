'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { fontClassName } from '@/lib/fonts';

function readFamilyTheme() {
  if (typeof document === 'undefined') return 'dark';
  return document.getElementById('family-root')?.getAttribute('data-family-theme') ?? 'dark';
}

/**
 * Escape #family-root / .family-app__frame overflow + backdrop-filter
 * (which make position:fixed relative to the frame and clip bottom sheets).
 */
export function FamilyBodyPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState(readFamilyTheme);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.getElementById('family-root');
    const sync = () => setTheme(readFamilyTheme());
    sync();
    const observer = new MutationObserver(sync);
    if (root) observer.observe(root, { attributes: true, attributeFilter: ['data-family-theme'] });
    return () => observer.disconnect();
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn('family-body-portal family-app family-portal-surface', fontClassName)}
      data-family-theme={theme}
    >
      {children}
    </div>,
    document.body,
  );
}
