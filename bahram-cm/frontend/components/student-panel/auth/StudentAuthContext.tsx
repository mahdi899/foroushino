'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { StudentFormPrefill } from '@/lib/student/formPrefill';

type OpenLoginOptions = {
  redirectTo?: string;
};

type StudentAuthContextValue = {
  isLoggedIn: boolean;
  displayName: string | null;
  prefill: StudentFormPrefill | null;
  loginOpen: boolean;
  redirectTo: string;
  openLogin: (options?: OpenLoginOptions) => void;
  closeLogin: () => void;
  markLoggedIn: (displayName?: string, prefill?: StudentFormPrefill | null) => void;
  markLoggedOut: () => void;
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
    setLoginOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setLoginOpen(false);
  }, []);

  const markLoggedIn = useCallback((name?: string, nextPrefill?: StudentFormPrefill | null) => {
    setIsLoggedIn(true);
    if (name) setDisplayName(name);
    if (nextPrefill !== undefined) setPrefill(nextPrefill);
    setLoginOpen(false);
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
      openLogin,
      closeLogin,
      markLoggedIn,
      markLoggedOut,
    }),
    [isLoggedIn, displayName, prefill, loginOpen, redirectTo, openLogin, closeLogin, markLoggedIn, markLoggedOut],
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
