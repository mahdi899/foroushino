'use client';

import { useEffect, useState, type RefObject } from 'react';

/** Fires after the element stays in view for `delayMs` (skips fast scroll). */
export function useDelayedInView<T extends Element>(
  ref: RefObject<T | null>,
  delayMs = 420,
  enabled = true,
): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }

    const el = ref.current;
    if (!el) return;

    let timer: number | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          timer = window.setTimeout(() => setReady(true), delayMs);
          return;
        }

        if (timer != null) window.clearTimeout(timer);
        setReady(false);
      },
      { threshold: 0.22, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer != null) window.clearTimeout(timer);
    };
  }, [delayMs, enabled, ref]);

  return ready;
}
