'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useVisualViewportBox } from '@/lib/hooks/useVisualViewportBox';
import { cn } from '@/lib/cn';
import { useStudentAuth } from './StudentAuthContext';
import { StudentLoginForm } from './StudentLoginForm';

export function StudentLoginModal() {
  const { loginOpen, closeLogin, redirectTo, loginContext } = useStudentAuth();
  // Track only the keyboard inset (padding), not live `scroll` ticks — the
  // modal shell stays pinned to `fixed inset-0`, so we never need to react
  // to every visualViewport scroll event mid keyboard-animation. That
  // constant re-layout was the main source of mobile lag.
  const viewport = useVisualViewportBox(loginOpen, { watchScroll: false });
  const [mounted, setMounted] = useState(false);
  // `visible` keeps the portal mounted long enough to play the exit
  // transition; `entered` toggles the actual opacity/transform classes.
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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

  // Lock background scroll while the modal is open. `overflow: hidden` alone
  // does not stop touch-driven scroll on mobile browsers, which is what made
  // the page/background jump around — pin the body in place with
  // `position: fixed`, lock the root element too, and (for the family/club
  // context) also lock the feed's own scroll container, then restore the
  // exact scroll position on close.
  useEffect(() => {
    if (!visible) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const root = document.documentElement;
    const feedEl = document.querySelector<HTMLElement>('.family-feed-scroll');

    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      bodyOverflow: body.style.overflow,
      rootOverflow: root.style.overflow,
      feedOverflow: feedEl?.style.overflow ?? '',
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    root.style.overflow = 'hidden';
    if (feedEl) feedEl.style.overflow = 'hidden';

    // Belt-and-suspenders for iOS Safari: block any touchmove that isn't
    // scrolling inside the login card itself, so a stray drag on the overlay
    // can never leak through to the page/feed behind it.
    const blockTouch = (e: TouchEvent) => {
      if (cardRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
    };
    document.addEventListener('touchmove', blockTouch, { passive: false });

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.bodyOverflow;
      root.style.overflow = prev.rootOverflow;
      if (feedEl) feedEl.style.overflow = prev.feedOverflow;
      document.removeEventListener('touchmove', blockTouch);
      window.scrollTo(0, scrollY);
    };
  }, [visible]);

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col items-stretch justify-center overflow-y-auto overscroll-contain"
      style={{
        paddingBottom: `max(1rem, calc(${viewport.keyboardInset}px + env(safe-area-inset-bottom, 0px)))`,
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
        ref={cardRef}
        className={cn(
          'relative z-10 mx-auto w-full max-w-[20rem] shrink-0 p-4',
          'transition-[opacity,transform] duration-150 ease-out',
          entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          viewport.keyboardInset > 48 ? 'mt-auto mb-4' : 'my-auto',
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
