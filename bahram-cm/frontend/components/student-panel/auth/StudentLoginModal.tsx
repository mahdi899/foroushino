'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStudentAuth } from './StudentAuthContext';
import { StudentLoginForm } from './StudentLoginForm';

export function StudentLoginModal() {
  const { loginOpen, closeLogin, redirectTo } = useStudentAuth();
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 cursor-pointer border-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.72)_100%)] backdrop-blur-[3px]"
            aria-hidden
            onClick={closeLogin}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-[20rem]"
          >
            <StudentLoginForm
              redirectTo={redirectTo}
              variant="modal"
              active={loginOpen}
              onClose={closeLogin}
            />
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
