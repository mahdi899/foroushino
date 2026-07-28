'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBackgroundScrollLock } from '@/lib/hooks/useBackgroundScrollLock';
import { useVisualViewportBox } from '@/lib/hooks/useVisualViewportBox';
import { cn } from '@/lib/cn';
import { useStudentAuth } from './StudentAuthContext';
import { StudentLoginForm } from './StudentLoginForm';

function blurActiveElement() {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) {
    active.blur();
  }
}

/** Take focus without scrolling — stops the browser returning focus to the opener control. */
function parkFocusWithoutScroll() {
  blurActiveElement();
  const body = document.body;
  const hadTabIndex = body.hasAttribute('tabindex');
  const prev = body.getAttribute('tabindex');
  body.setAttribute('tabindex', '-1');
  body.focus({ preventScroll: true });
  if (!hadTabIndex) body.removeAttribute('tabindex');
  else if (prev != null) body.setAttribute('tabindex', prev);
}

export function StudentLoginModal() {
  const { loginOpen, closeLogin, redirectTo, loginContext, loginPurpose, peekLoginScrollY } = useStudentAuth();
  const viewport = useVisualViewportBox(loginOpen, { watchScroll: false });
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const scrollYRef = useRef(0);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loginOpen) return;
    const fromOpen = peekLoginScrollY();
    scrollYRef.current = typeof fromOpen === 'number' ? fromOpen : window.scrollY;
  }, [loginOpen, peekLoginScrollY]);

  useEffect(() => {
    if (loginOpen) {
      wasOpenRef.current = true;
      return;
    }
    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;

    const y = scrollYRef.current;
    parkFocusWithoutScroll();
    const restore = () => window.scrollTo({ top: y, left: 0, behavior: 'auto' });
    requestAnimationFrame(() => {
      parkFocusWithoutScroll();
      restore();
      requestAnimationFrame(restore);
    });
    const t1 = window.setTimeout(() => {
      parkFocusWithoutScroll();
      restore();
    }, 0);
    const t2 = window.setTimeout(restore, 120);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [loginOpen]);

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

  // Overflow lock keeps sticky headers / page layout unchanged behind the dimmer.
  useBackgroundScrollLock(loginOpen, {
    allowTouchInsideRef: shellRef,
    strategy: 'overflow',
  });

  function handleClose() {
    parkFocusWithoutScroll();
    closeLogin();
  }

  if (!mounted || !visible) return null;

  const keyboardOpen = viewport.keyboardInset > 48;

  return createPortal(
    <div
      ref={shellRef}
      className={cn(
        'fixed inset-0 z-[100] flex overflow-y-auto overscroll-contain p-4',
        keyboardOpen ? 'items-end justify-center pb-4' : 'items-center justify-center',
      )}
      style={{
        paddingBottom: keyboardOpen
          ? 'max(1rem, env(safe-area-inset-bottom, 0px))'
          : undefined,
      }}
    >
      <div
        className={cn(
          'absolute inset-0 cursor-pointer border-0 bg-black/70 transition-opacity duration-150 ease-out',
          entered ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden
        onClick={handleClose}
      />

      <div
        className={cn(
          'relative z-10 mx-auto w-full max-w-[20rem] shrink-0',
          'transition-[opacity,transform] duration-150 ease-out',
          entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
        )}
      >
        <StudentLoginForm
          redirectTo={redirectTo}
          variant="modal"
          active={loginOpen}
          onClose={handleClose}
          context={loginContext}
          purpose={loginPurpose}
        />
      </div>
    </div>,
    document.body,
  );
}
