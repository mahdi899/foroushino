'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBackgroundScrollLock } from '@/lib/hooks/useBackgroundScrollLock';
import { useVisualViewportBox } from '@/lib/hooks/useVisualViewportBox';
import { cn } from '@/lib/cn';
import { useStudentAuth } from './StudentAuthContext';
import { StudentLoginForm } from './StudentLoginForm';

export function StudentLoginModal() {
  const { loginOpen, closeLogin, redirectTo, loginContext } = useStudentAuth();
  // Track keyboard + visible box without scroll thrashing during the open animation.
  const viewport = useVisualViewportBox(loginOpen, { watchScroll: false });
  const [mounted, setMounted] = useState(false);
  // `visible` keeps the portal mounted long enough to play the exit
  // transition; `entered` toggles the actual opacity/transform classes.
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Simple CSS opacity/transform transition instead of a JS animation
  // library — cheap on mobile and avoids fighting the keyboard's own
  // resize/scroll events for control of the frame.
  useEffect(() => {
    if (loginOpen) {
      setVisible(true);
      const frame = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(frame);
    }

    setEntered(false);
    const timer = window.setTimeout(() => setVisible(false), 150);
    return () => window.clearTimeout(timer);
  }, [loginOpen]);

  useBackgroundScrollLock(visible, { allowTouchInsideRef: shellRef });

  if (!mounted || !visible) return null;

  const shellHeight = viewport.height > 0 ? viewport.height : undefined;
  const keyboardOpen = viewport.keyboardInset > 48;

  return createPortal(
    <div
      ref={shellRef}
      className="fixed inset-x-0 z-[100] flex flex-col items-stretch justify-center overflow-y-auto overscroll-contain"
      style={{
        // Pin the shell to the visible visualViewport so the keyboard never
        // resizes or pans the page behind the modal — only this overlay moves.
        top: viewport.offsetTop,
        height: shellHeight ?? '100dvh',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Simple, cheap overlay — no backdrop-filter/blur, which is what
          made this laggy on mobile GPUs. A short opacity fade is plenty. */}
      <div
        className={cn(
          'absolute inset-0 cursor-pointer border-0 bg-black/70 transition-opacity duration-150 ease-out',
          entered ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden
        onClick={closeLogin}
      />

      <div
        className={cn(
          'relative z-10 mx-auto w-full max-w-[20rem] shrink-0 p-4',
          'transition-[opacity,transform] duration-150 ease-out',
          entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          // When the keyboard owns the bottom of the visual viewport, pin the
          // card near the bottom of the remaining space instead of centering
          // into the obscured half of the screen.
          keyboardOpen ? 'mt-auto mb-4' : 'my-auto',
        )}
      >
        <StudentLoginForm
          redirectTo={redirectTo}
          variant="modal"
          active={loginOpen}
          onClose={closeLogin}
          context={loginContext}
        />
      </div>
    </div>,
    document.body,
  );
}
