'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useStudentAuthOptional } from '@/components/student-panel/auth/StudentAuthContext';
import { familyLoginRedirectPath } from '@/lib/family/join-context';

export const FAMILY_LOGIN_REDIRECT = '/family';

export function FamilyGuestLoginBoot({ autoOpen = true }: { autoOpen?: boolean }) {
  const auth = useStudentAuthOptional();
  const openedRef = useRef(false);

  useEffect(() => {
    if (!autoOpen || !auth || auth.isLoggedIn || auth.loginOpen || openedRef.current) return;
    openedRef.current = true;
    auth.openLogin({ redirectTo: familyLoginRedirectPath(), context: 'family' });
  }, [auth, autoOpen]);

  return null;
}

export function useFamilyGuestLogin() {
  const auth = useStudentAuthOptional();

  return {
    openLogin: () => auth?.openLogin({ redirectTo: familyLoginRedirectPath(), context: 'family' }),
  };
}

/** @deprecated Use `useFamilyGuestLogin` */
export function useFamilyGuestAuthOptional() {
  return useFamilyGuestLogin();
}

export function FamilyGuestBlur({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'min-h-0 flex-1 blur-[10px] saturate-[0.55] brightness-[0.92] transition-[filter] duration-300 pointer-events-none select-none',
        className,
      )}
      aria-hidden
    >
      {children}
    </div>
  );
}
