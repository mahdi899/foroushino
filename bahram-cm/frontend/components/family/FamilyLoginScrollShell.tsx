'use client';

import type { ReactNode } from 'react';
import { useVisualViewportBox } from '@/lib/hooks/useVisualViewportBox';

/** Keeps family login content scrollable and above the mobile keyboard. */
export function FamilyLoginScrollShell({ children }: { children: ReactNode }) {
  const { offsetTop, height, keyboardInset } = useVisualViewportBox(true);
  const shellHeight = height > 0 ? height : undefined;

  return (
    <main
      id="main-content"
      className="fixed inset-x-0 z-[1] flex flex-col overflow-y-auto overscroll-contain px-5 py-6 sm:py-10"
      style={{
        top: offsetTop,
        height: shellHeight ?? '100dvh',
        paddingBottom: `max(1.5rem, calc(${keyboardInset}px + env(safe-area-inset-bottom, 0px)))`,
      }}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center">{children}</div>
    </main>
  );
}
