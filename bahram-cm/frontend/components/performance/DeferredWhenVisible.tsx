'use client';

import { useRef, type ReactNode } from 'react';
import { useWhenVisible } from '@/hooks/useWhenVisible';

type Props = {
  children: ReactNode;
  /** Placeholder while the section is off-screen (also avoids loading child JS). */
  fallback?: ReactNode;
  /** IntersectionObserver root margin — preload slightly before entering viewport. */
  rootMargin?: string;
  className?: string;
};

/** Renders children only after the wrapper enters (or nears) the viewport. */
export function DeferredWhenVisible({
  children,
  fallback = null,
  rootMargin = '480px 0px',
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useWhenVisible(ref, { rootMargin });

  return <div ref={ref} className={className}>{visible ? children : fallback}</div>;
}
