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
  const isFamilyLogin = loginContext === 'family';
  const viewport = useVisualViewportBox(loginOpen && isFamilyLogin);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loginOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [loginOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {loginOpen ? (
        <div
          className={cn(
            'fixed z-[100]',
            isFamilyLogin
              ? 'inset-x-0 flex flex-col overflow-y-auto overscroll-contain p-4'
              : 'inset-0 flex items-center justify-center p-4 sm:p-5',
          )}
          style={
            isFamilyLogin
              ? {
                  top: viewport.offsetTop,
                  height: viewport.height > 0 ? viewport.height : '100dvh',
                  paddingBottom: `max(1rem, calc(${viewport.keyboardInset}px + env(safe-area-inset-bottom, 0px)))`,
                }
              : undefined
          }
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'cursor-pointer border-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.72)_100%)] backdrop-blur-[3px]',
              isFamilyLogin ? 'fixed inset-0' : 'absolute inset-0',
            )}
            style={
              isFamilyLogin
                ? {
                    top: viewport.offsetTop,
                    height: viewport.height > 0 ? viewport.height : '100dvh',
                  }
                : undefined
            }
            aria-hidden
            onClick={closeLogin}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative z-10 w-full max-w-[20rem]',
              isFamilyLogin && 'mx-auto my-auto min-h-0 shrink-0',
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
