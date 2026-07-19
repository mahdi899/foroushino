'use client';

import { useEffect, useRef } from 'react';

type OverlayKey = 'comments' | 'notifications' | 'stories' | 'lightbox';

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

/**
 * Sync overlay open/close with browser history + Telegram Mini App BackButton
 * so the phone system Back closes the overlay instead of doing nothing.
 */
export function useOverlayHistoryBack(active: OverlayKey | null, onBack: () => void): void {
  const closedByPopRef = useRef(false);
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  const handleBack = () => {
    onBackRef.current();
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!active) {
      getTelegramWebApp()?.BackButton?.hide();
      return;
    }

    closedByPopRef.current = false;
    window.history.pushState({ familyOverlay: active }, '');

    const onPopState = () => {
      closedByPopRef.current = true;
      handleBack();
    };

    window.addEventListener('popstate', onPopState);

    const tg = getTelegramWebApp();
    const onTgBack = () => {
      if (window.history.state?.familyOverlay) {
        window.history.back();
      } else {
        handleBack();
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
      // navigating away from the family page.
      if (!closedByPopRef.current && window.history.state?.familyOverlay === active) {
        window.history.back();
      }
    };
  }, [active]);
}
