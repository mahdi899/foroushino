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
import { cn } from '@/lib/cn';
import {
  FAMILY_GUEST_CTA,
  FAMILY_GUEST_PROMPTS,
  type FamilyGuestAction,
} from '@/lib/family/guest-access';
import { useFamilyGuestLogin } from '@/components/family/FamilyGuestAuth';

type FamilyGuestAccessContextValue = {
  promptLogin: (action: FamilyGuestAction) => void;
  openLogin: () => void;
};

const FamilyGuestAccessContext = createContext<FamilyGuestAccessContextValue | null>(null);

function FamilyGuestHint({
  message,
  onLogin,
  onDismiss,
}: {
  message: string;
  onLogin: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="family-guest-hint pointer-events-auto fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[80] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          'family-guest-hint__card flex w-full max-w-[min(100%,420px)] items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg',
          'border-[color-mix(in_oklab,var(--family-tg-pinned-accent)_22%,var(--family-border-subtle))]',
          'bg-[color-mix(in_oklab,var(--family-surface)_92%,transparent)] backdrop-blur-xl',
        )}
      >
        <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-bone">{message}</p>
        <button
          type="button"
          onClick={onLogin}
          className="family-btn-primary shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold"
        >
          {FAMILY_GUEST_CTA}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg px-2 py-1 text-xs text-bone/45 transition hover:text-bone/70"
          aria-label="بستن"
        >
          بستن
        </button>
      </div>
    </div>
  );
}

export function FamilyGuestAccessProvider({ children }: { children: ReactNode }) {
  const { openLogin } = useFamilyGuestLogin();
  const [hint, setHint] = useState<{ id: number; message: string } | null>(null);
  const dismissTimerRef = useRef<number | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current != null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const dismissHint = useCallback(() => {
    clearDismissTimer();
    setHint(null);
  }, [clearDismissTimer]);

  const promptLogin = useCallback(
    (action: FamilyGuestAction) => {
      clearDismissTimer();
      const message = FAMILY_GUEST_PROMPTS[action];
      setHint({ id: Date.now(), message });
      dismissTimerRef.current = window.setTimeout(() => {
        setHint(null);
        dismissTimerRef.current = null;
      }, 4500);
    },
    [clearDismissTimer],
  );

  const handleOpenLogin = useCallback(() => {
    dismissHint();
    openLogin();
  }, [dismissHint, openLogin]);

  useEffect(() => () => clearDismissTimer(), [clearDismissTimer]);

  return (
    <FamilyGuestAccessContext.Provider value={{ promptLogin, openLogin: handleOpenLogin }}>
      {children}
      {hint ? (
        <FamilyGuestHint
          key={hint.id}
          message={hint.message}
          onLogin={handleOpenLogin}
          onDismiss={dismissHint}
        />
      ) : null}
    </FamilyGuestAccessContext.Provider>
  );
}

export function useFamilyGuestAccess() {
  const ctx = useContext(FamilyGuestAccessContext);
  if (!ctx) {
    throw new Error('useFamilyGuestAccess must be used within FamilyGuestAccessProvider');
  }
  return ctx;
}

export function useFamilyGuestAccessOptional() {
  return useContext(FamilyGuestAccessContext);
}
