'use client';

import { useEffect, useState } from 'react';

export type VisualViewportBox = {
  offsetTop: number;
  height: number;
  keyboardInset: number;
};

function readVirtualKeyboardInset(): number {
  const nav = navigator as Navigator & {
    virtualKeyboard?: { boundingRect: DOMRectReadOnly };
  };
  const h = nav.virtualKeyboard?.boundingRect?.height ?? 0;
  return h > 40 ? Math.round(h) : 0;
}

export function readVisualViewportBox(): VisualViewportBox {
  if (typeof window === 'undefined') {
    return { offsetTop: 0, height: 0, keyboardInset: 0 };
  }
  const vv = window.visualViewport;
  if (!vv) {
    return { offsetTop: 0, height: window.innerHeight, keyboardInset: 0 };
  }

  const offsetTop = Math.round(vv.offsetTop);
  const height = Math.round(vv.height);

  let keyboardInset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));

  // overlays-content: layout viewport may shrink even when visualViewport height does not.
  const layoutGap = Math.max(0, window.innerHeight - document.documentElement.clientHeight);
  if (layoutGap > 48) {
    keyboardInset = Math.max(keyboardInset, layoutGap);
  }

  keyboardInset = Math.max(keyboardInset, readVirtualKeyboardInset());

  return { offsetTop, height, keyboardInset };
}

/** Track mobile keyboard / browser chrome via Visual Viewport (family PWA). */
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
    window.addEventListener('focusin', sync);
    window.addEventListener('focusout', sync);
    return () => {
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('focusin', sync);
      window.removeEventListener('focusout', sync);
    };
  }, [enabled]);

  return box;
}
