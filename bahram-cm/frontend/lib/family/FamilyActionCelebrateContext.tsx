'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { getFamilyPortalRoot } from '@/lib/family/portal';
import { familyMotion } from '@/lib/family/motion';
import type { FamilyActionType } from '@/lib/family/types';

type CelebratePayload = {
  type: FamilyActionType;
};

type CelebrateToast = {
  id: number;
  payload: CelebratePayload;
};

const FamilyActionCelebrateContext = createContext<((payload: CelebratePayload) => void) | null>(null);

function celebrateCopy(type: FamilyActionType): { title: string; subtitle: string } {
  switch (type) {
    case 'commitment':
      return { title: 'تعهدت ثبت شد!', subtitle: 'قدم کوچک، نتیجه بزرگ' };
    case 'confirmation':
      return { title: 'ثبت شد', subtitle: 'بهرام پاسخت را می‌بیند' };
    case 'single_choice':
    case 'multi_choice':
      return { title: 'رأیت ثبت شد', subtitle: 'به نظرسنجی اضافه شد' };
    case 'short_text':
      return { title: 'پاسخت رسید', subtitle: 'ممنون که نوشتی' };
    case 'number':
      return { title: 'عدد ثبت شد', subtitle: 'آمار امروزت کامل‌تر شد' };
    case 'scale':
      return { title: 'امتیاز ثبت شد', subtitle: 'نظر تو مهمه' };
    default:
      return { title: 'ثبت شد', subtitle: 'بهرام می‌تواند ببیند' };
  }
}

function CelebrateBurst({ active }: { active: boolean }) {
  if (!active) return null;

  const dots = [
    { x: '-1.4rem', y: '-1.1rem', delay: 0 },
    { x: '1.3rem', y: '-0.9rem', delay: 0.04 },
    { x: '-1rem', y: '1rem', delay: 0.08 },
    { x: '1.1rem', y: '0.95rem', delay: 0.06 },
    { x: '0', y: '-1.35rem', delay: 0.02 },
    { x: '-1.25rem', y: '0.1rem', delay: 0.1 },
  ];

  return (
    <div className="family-action-celebrate__burst" aria-hidden>
      {dots.map((dot, index) => (
        <span
          key={index}
          className="family-action-celebrate__spark"
          style={
            {
              '--burst-x': dot.x,
              '--burst-y': dot.y,
              '--burst-delay': `${dot.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function FamilyActionCelebrateOverlay({
  toast,
  onDismiss,
}: {
  toast: CelebrateToast | null;
  onDismiss: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const copy = toast ? celebrateCopy(toast.payload.type) : null;

  return createPortal(
    <div className="family-action-celebrate-region" aria-live="polite">
      <AnimatePresence>
        {toast && copy ? (
          <motion.div
            key={toast.id}
            className="family-action-celebrate-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onDismiss}
          >
            <motion.div
              role="status"
              className="family-action-celebrate-card"
              initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.94 }}
              transition={familyMotion.spring}
              onClick={(e) => e.stopPropagation()}
            >
              <CelebrateBurst active={!reduceMotion} />
              <motion.span
                className="family-action-celebrate-card__icon-wrap"
                initial={reduceMotion ? false : { scale: 0.5, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...familyMotion.spring, delay: 0.06 }}
              >
                <CheckCircle2 className="family-action-celebrate-card__icon" strokeWidth={2.25} aria-hidden />
                <Sparkles className="family-action-celebrate-card__sparkle" strokeWidth={2} aria-hidden />
              </motion.span>
              <p className="family-action-celebrate-card__title">{copy.title}</p>
              <p className="family-action-celebrate-card__subtitle">{copy.subtitle}</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    getFamilyPortalRoot(),
  );
}

export function FamilyActionCelebrateProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<CelebrateToast | null>(null);
  const timerRef = useRef<number | null>(null);
  const toastIdRef = useRef(0);

  const dismiss = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const celebrate = useCallback(
    (next: CelebratePayload) => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
      }
      toastIdRef.current += 1;
      setToast({ id: toastIdRef.current, payload: next });
      timerRef.current = window.setTimeout(dismiss, 2600);
    },
    [dismiss],
  );

  useEffect(() => () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
    }
  }, []);

  return (
    <FamilyActionCelebrateContext.Provider value={celebrate}>
      {children}
      <FamilyActionCelebrateOverlay toast={toast} onDismiss={dismiss} />
    </FamilyActionCelebrateContext.Provider>
  );
}

export function useFamilyActionCelebrate() {
  const celebrate = useContext(FamilyActionCelebrateContext);
  if (!celebrate) {
    throw new Error('useFamilyActionCelebrate must be used within FamilyActionCelebrateProvider');
  }
  return celebrate;
}
