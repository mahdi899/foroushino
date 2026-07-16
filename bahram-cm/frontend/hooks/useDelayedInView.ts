'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/** Fires after the element stays in view (and optionally scroll is idle) for `delayMs`. */
export function useDelayedInView<T extends Element>(
  ref: RefObject<T | null>,
  delayMs = 900,
  enabled = true,
  scrollIdle = true,
): boolean {
  const [ready, setReady] = useState(false);
  const intersectingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      intersectingRef.current = false;
      setReady(false);
      return;
    }

    const el = ref.current;
    if (!el) return;

    let timer: number | undefined;

    const clear = () => {
      if (timer != null) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };

    const arm = () => {
      clear();
      if (!intersectingRef.current || !scrollIdle) return;
      timer = window.setTimeout(() => setReady(true), delayMs);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        intersectingRef.current = Boolean(entry?.isIntersecting);
        if (!intersectingRef.current) {
          clear();
          setReady(false);
          return;
        }
        arm();
      },
      { threshold: 0.15, rootMargin: '120px 0px' },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      clear();
    };
  }, [delayMs, enabled, ref, scrollIdle]);

  // When scroll settles while already intersecting, (re)arm the timer.
  useEffect(() => {
    if (!enabled || !scrollIdle || !intersectingRef.current || ready) return;
    const timer = window.setTimeout(() => setReady(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, enabled, ready, scrollIdle]);

  return ready;
}
