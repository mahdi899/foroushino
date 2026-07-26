'use client';

import { useLayoutEffect } from 'react';

/** Ask the OS/browser to resize the layout when the virtual keyboard opens (Telegram-style). */
export function FamilyKeyboardViewportBoot() {
  useLayoutEffect(() => {
    const nav = navigator as Navigator & {
      virtualKeyboard?: { overlaysContent: boolean };
    };
    try {
      if (nav.virtualKeyboard) {
        nav.virtualKeyboard.overlaysContent = false;
      }
    } catch {
      // Unsupported browser — viewport meta interactiveWidget handles it.
    }
  }, []);

  return null;
}
