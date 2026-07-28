'use client';

import { useEffect, useState, type RefObject } from 'react';

type SharedObserver = {
  observer: IntersectionObserver;
  callbacks: Map<Element, () => void>;
};

/**
 * One observer per rootMargin instead of one per element: an image album page can
 * mount hundreds of lazy targets, and each extra IntersectionObserver costs its own
 * bookkeeping on every scroll/layout change.
 */
const sharedObservers = new Map<string, SharedObserver>();

function getSharedObserver(rootMargin: string): SharedObserver {
  const existing = sharedObservers.get(rootMargin);
  if (existing) return existing;

  const callbacks = new Map<Element, () => void>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const onVisible = callbacks.get(entry.target);
        if (!onVisible) continue;
        callbacks.delete(entry.target);
        observer.unobserve(entry.target);
        onVisible();
      }
    },
    { threshold: 0.01, rootMargin },
  );

  const shared = { observer, callbacks };
  sharedObservers.set(rootMargin, shared);
  return shared;
}

/** Start loading when near the viewport once — never tear down after that. */
export function useLazyInViewOnce<T extends Element>(
  ref: RefObject<T | null>,
  enabled = true,
  rootMargin = '160px 0px',
): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled || ready) return;

    let cancelled = false;
    let raf = 0;
    let observed: Element | null = null;

    const detach = () => {
      if (!observed) return;
      const { observer, callbacks } = getSharedObserver(rootMargin);
      callbacks.delete(observed);
      observer.unobserve(observed);
      observed = null;
    };

    const attach = () => {
      if (cancelled) return;
      const el = ref.current;
      if (!el) {
        // Virtual rows / conditional mounts can leave ref empty for one frame.
        raf = requestAnimationFrame(attach);
        return;
      }

      const { observer, callbacks } = getSharedObserver(rootMargin);
      observed = el;
      callbacks.set(el, () => {
        if (!cancelled) setReady(true);
      });
      observer.observe(el);
    };

    attach();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      detach();
    };
  }, [enabled, ready, ref, rootMargin]);

  return ready;
}
