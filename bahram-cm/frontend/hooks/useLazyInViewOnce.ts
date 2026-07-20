'use client';

import { useEffect, useState, type RefObject } from 'react';

/** Start loading when near the viewport once — never tear down after that. */
export function useLazyInViewOnce<T extends Element>(
  ref: RefObject<T | null>,
  enabled = true,
  rootMargin = '160px 0px',
): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled || ready) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setReady(true);
          observer.disconnect();
        }
      },
      { threshold: 0.01, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, ready, ref, rootMargin]);

  return ready;
}
