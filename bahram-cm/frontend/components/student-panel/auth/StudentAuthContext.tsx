'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { StudentFormPrefill } from '@/lib/student/formPrefill';

type OpenLoginOptions = {
  redirectTo?: string;
  context?: 'panel' | 'family';
  purpose?: 'default' | 'comment';
  /** When set (e.g. comment flow), login stays on-page and then runs this. */
  onSuccess?: () => void;
  /** Preserve page scroll across open/close (avoids jump-to-opener). */
  scrollY?: number;
};

type StudentAuthContextValue = {
  isLoggedIn: boolean;
  displayName: string | null;
  prefill: StudentFormPrefill | null;
  loginOpen: boolean;
  redirectTo: string;
  loginContext: 'panel' | 'family';
  loginPurpose: 'default' | 'comment';
  openLogin: (options?: OpenLoginOptions) => void;
  closeLogin: () => void;
  markLoggedIn: (displayName?: string, prefill?: StudentFormPrefill | null) => void;
  markLoggedOut: () => void;
  consumeLoginSuccess: () => void;
  takeLoginScrollY: () => number | null;
  peekLoginScrollY: () => number | null;
};

const StudentAuthContext = createContext<StudentAuthContextValue | null>(null);

export function StudentAuthProvider({
  children,
  initialLoggedIn = false,
  initialDisplayName = null,
  initialPrefill = null,
}: {
  children: React.ReactNode;
  initialLoggedIn?: boolean;
  initialDisplayName?: string | null;
  initialPrefill?: StudentFormPrefill | null;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoggedIn);
  const [displayName, setDisplayName] = useState<string | null>(initialDisplayName);
  const [prefill, setPrefill] = useState<StudentFormPrefill | null>(initialPrefill);
  const [loginOpen, setLoginOpen] = useState(false);
  const [redirectTo, setRedirectTo] = useState('/panel');
  const [loginContext, setLoginContext] = useState<'panel' | 'family'>('panel');
  const [loginPurpose, setLoginPurpose] = useState<'default' | 'comment'>('default');
  const onSuccessRef = useRef<(() => void) | null>(null);
  const scrollYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!initialLoggedIn) {
      setIsLoggedIn(false);
      setDisplayName(null);
      setPrefill(null);
      return;
    }

    setIsLoggedIn(true);
    if (initialDisplayName) {
      setDisplayName(initialDisplayName);
    }
    setPrefill(initialPrefill);
  }, [initialLoggedIn, initialDisplayName, initialPrefill]);

  const openLogin = useCallback((options?: OpenLoginOptions) => {
    setRedirectTo(options?.redirectTo ?? '/panel');
    setLoginContext(options?.context ?? 'panel');
    setLoginPurpose(options?.purpose ?? 'default');
    onSuccessRef.current = options?.onSuccess ?? null;
    scrollYRef.current =
      typeof options?.scrollY === 'number' && Number.isFinite(options.scrollY)
        ? options.scrollY
        : typeof window !== 'undefined'
          ? window.scrollY
          : null;
    setLoginOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setLoginOpen(false);
    setLoginContext('panel');
    setLoginPurpose('default');
    onSuccessRef.current = null;
  }, []);

  const consumeLoginSuccess = useCallback(() => {
    const cb = onSuccessRef.current;
    onSuccessRef.current = null;
    cb?.();
  }, []);

  const takeLoginScrollY = useCallback(() => {
    const y = scrollYRef.current;
    scrollYRef.current = null;
    return y;
  }, []);

  const peekLoginScrollY = useCallback(() => scrollYRef.current, []);

  const markLoggedIn = useCallback((name?: string, nextPrefill?: StudentFormPrefill | null) => {
    setIsLoggedIn(true);
    if (name) setDisplayName(name);
    if (nextPrefill !== undefined) setPrefill(nextPrefill);
    setLoginOpen(false);
    setLoginPurpose('default');
  }, []);

  const markLoggedOut = useCallback(() => {
    setIsLoggedIn(false);
    setDisplayName(null);
    setPrefill(null);
  }, []);

  const value = useMemo(
    () => ({
      isLoggedIn,
      displayName,
      prefill,
      loginOpen,
      redirectTo,
      loginContext,
      loginPurpose,
      openLogin,
      closeLogin,
      markLoggedIn,
      markLoggedOut,
      consumeLoginSuccess,
      takeLoginScrollY,
      peekLoginScrollY,
    }),
    [isLoggedIn, displayName, prefill, loginOpen, redirectTo, loginContext, loginPurpose, openLogin, closeLogin, markLoggedIn, markLoggedOut, consumeLoginSuccess, takeLoginScrollY, peekLoginScrollY],
  );

  return <StudentAuthContext.Provider value={value}>{children}</StudentAuthContext.Provider>;
}

export function useStudentAuthOptional() {
  return useContext(StudentAuthContext);
}

export function useStudentAuth() {
  const ctx = useStudentAuthOptional();
  if (!ctx) {
    throw new Error('useStudentAuth must be used within StudentAuthProvider');
  }
  return ctx;
}

export function useStudentFormPrefill(): StudentFormPrefill | null {
  return useStudentAuthOptional()?.prefill ?? null;
}
