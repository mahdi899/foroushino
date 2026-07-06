'use client';

import { useEffect, useState, type RefObject } from 'react';

/** Activates once `ref` enters the viewport (with optional root margin). */
export function useWhenVisible<T extends Element>(
  ref: RefObject<T | null>,
  options?: { rootMargin?: string; enabled?: boolean },
): boolean {
  const enabled = options?.enabled ?? true;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || visible) return;

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: options?.rootMargin ?? '320px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, options?.rootMargin, visible, ref]);

  return visible;
}
