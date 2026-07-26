'use client';

import { useEffect, useState } from 'react';

export type VisualViewportBox = {
  offsetTop: number;
  height: number;
  keyboardInset: number;
};

export function readVisualViewportBox(): VisualViewportBox {
  if (typeof window === 'undefined') {
    return { offsetTop: 0, height: 0, keyboardInset: 0 };
  }
  const vv = window.visualViewport;
  if (!vv) {
    return { offsetTop: 0, height: window.innerHeight, keyboardInset: 0 };
  }
  const keyboardInset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
  return {
    offsetTop: Math.round(vv.offsetTop),
    height: Math.round(vv.height),
    keyboardInset,
  };
}

/** Track mobile keyboard / browser chrome via Visual Viewport (overlays-content PWA). */
export function useVisualViewportBox(enabled = true): VisualViewportBox {
  const [box, setBox] = useState<VisualViewportBox>(() =>
    enabled ? readVisualViewportBox() : { offsetTop: 0, height: 0, keyboardInset: 0 },
  );

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const sync = () => {
      setBox((prev) => {
        const next = readVisualViewportBox();
        if (
          prev.offsetTop === next.offsetTop &&
          prev.height === next.height &&
          prev.keyboardInset === next.keyboardInset
        ) {
          return prev;
        }
        return next;
      });
    };

    sync();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    return () => {
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [enabled]);

  return box;
}
