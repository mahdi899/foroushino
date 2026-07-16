'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { fontClassName } from '@/lib/fonts';

function readFamilyTheme() {
  if (typeof document === 'undefined') return 'dark';
  return document.getElementById('family-root')?.getAttribute('data-family-theme') ?? 'dark';
}

/** Escape #family-root overflow clipping for reaction overlays. */
export function FamilyBodyPortal({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState(readFamilyTheme);

  useEffect(() => {
    const root = document.getElementById('family-root');
    const sync = () => setTheme(readFamilyTheme());
    sync();
    const observer = new MutationObserver(sync);
    if (root) observer.observe(root, { attributes: true, attributeFilter: ['data-family-theme'] });
    return () => observer.disconnect();
  }, []);

  if (typeof document === 'undefined') return null;

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
