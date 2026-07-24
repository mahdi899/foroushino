'use client';

import { useEffect, useRef } from 'react';

type OverlayKey = 'comments' | 'notifications' | 'stories' | 'lightbox' | 'menu';

type OverlayHistoryState = {
  familyOverlay: OverlayKey;
  familyOverlayNonce: number;
};

type TelegramWebAppLike = {
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
};

function getTelegramWebApp(): TelegramWebAppLike | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Telegram?: { WebApp?: TelegramWebAppLike } }).Telegram?.WebApp;
}

function isOverlayState(
  state: unknown,
  active: OverlayKey,
  nonce: number,
): state is OverlayHistoryState {
  if (!state || typeof state !== 'object') return false;
  const s = state as OverlayHistoryState;
  return s.familyOverlay === active && s.familyOverlayNonce === nonce;
}

/**
 * Sync overlay open/close with browser history + Telegram Mini App BackButton
 * so the phone system Back closes the overlay instead of doing nothing.
 *
 * Cleanup uses a nonce + microtask so React Strict Mode remount does not
 * immediately pop the fresh history entry (which would close the sheet).
 */
export function useOverlayHistoryBack(active: OverlayKey | null, onBack: () => void): void {
  const closedByPopRef = useRef(false);
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!active) {
      getTelegramWebApp()?.BackButton?.hide();
      return;
    }

    closedByPopRef.current = false;
    const nonce = Date.now() + Math.random();
    const pushed: OverlayHistoryState = { familyOverlay: active, familyOverlayNonce: nonce };
    window.history.pushState(pushed, '');

    const onPopState = () => {
      closedByPopRef.current = true;
      onBackRef.current();
    };

    window.addEventListener('popstate', onPopState);

    const tg = getTelegramWebApp();
    const onTgBack = () => {
      if (window.history.state && typeof window.history.state === 'object' && 'familyOverlay' in window.history.state) {
        window.history.back();
      } else {
        onBackRef.current();
      }
    };

    if (tg?.BackButton) {
      tg.BackButton.show();
      tg.BackButton.onClick(onTgBack);
    }

    return () => {
      window.removeEventListener('popstate', onPopState);
      tg?.BackButton?.offClick(onTgBack);
      tg?.BackButton?.hide();

      // UI closed the overlay: remove the synthetic history entry without
      // navigating away. Defer + nonce so Strict Mode remount can push a new
      // entry first; the stale cleanup then no-ops instead of closing it.
      if (!closedByPopRef.current) {
        queueMicrotask(() => {
          if (isOverlayState(window.history.state, active, nonce)) {
            window.history.back();
          }
        });
      }
    };
  }, [active]);
}
