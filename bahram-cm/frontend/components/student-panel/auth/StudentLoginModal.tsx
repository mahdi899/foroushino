'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useVisualViewportBox } from '@/lib/hooks/useVisualViewportBox';
import { cn } from '@/lib/cn';
import { useStudentAuth } from './StudentAuthContext';
import { StudentLoginForm } from './StudentLoginForm';

export function StudentLoginModal() {
  const { loginOpen, closeLogin, redirectTo, loginContext } = useStudentAuth();
  // Track the visual viewport (keyboard inset) for BOTH contexts — بهرام (panel)
  // and خانواده (family) — so the card slides up above the mobile keyboard
  // instead of getting covered by it, without ever resizing the page/background.
  const viewport = useVisualViewportBox(loginOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scroll while the modal is open. `overflow: hidden` alone
  // does not stop touch-driven scroll on mobile browsers, which is what made
  // the page/background jump around whenever the keyboard opened — pin the
  // body in place with `position: fixed` and restore the exact scroll
  // position on close instead.
  useEffect(() => {
    if (!loginOpen) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [loginOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {loginOpen ? (
        <div
          className="fixed inset-x-0 z-[100] flex flex-col overflow-y-auto overscroll-contain"
          style={{
            top: viewport.offsetTop,
            height: viewport.height > 0 ? viewport.height : '100dvh',
            paddingBottom: `max(1rem, calc(${viewport.keyboardInset}px + env(safe-area-inset-bottom, 0px)))`,
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 cursor-pointer border-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.72)_100%)] backdrop-blur-[3px]"
            style={{
              top: viewport.offsetTop,
              height: viewport.height > 0 ? viewport.height : '100dvh',
            }}
            aria-hidden
            onClick={closeLogin}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative z-10 mx-auto w-full max-w-[20rem] shrink-0 p-4',
              viewport.keyboardInset > 48 ? 'mt-auto mb-4' : 'my-auto min-h-0',
            )}
          >
            <StudentLoginForm
              redirectTo={redirectTo}
              variant="modal"
              active={loginOpen}
              onClose={closeLogin}
              context={loginContext}
            />
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
