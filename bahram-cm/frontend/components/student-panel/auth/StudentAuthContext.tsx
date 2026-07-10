'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type OpenLoginOptions = {
  redirectTo?: string;
};

type StudentAuthContextValue = {
  isLoggedIn: boolean;
  displayName: string | null;
  loginOpen: boolean;
  redirectTo: string;
  openLogin: (options?: OpenLoginOptions) => void;
  closeLogin: () => void;
  markLoggedIn: (displayName?: string) => void;
  markLoggedOut: () => void;
};

const StudentAuthContext = createContext<StudentAuthContextValue | null>(null);

export function StudentAuthProvider({
  children,
  initialLoggedIn = false,
  initialDisplayName = null,
}: {
  children: React.ReactNode;
  initialLoggedIn?: boolean;
  initialDisplayName?: string | null;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoggedIn);
  const [displayName, setDisplayName] = useState<string | null>(initialDisplayName);
  const [loginOpen, setLoginOpen] = useState(false);
  const [redirectTo, setRedirectTo] = useState('/panel');

  useEffect(() => {
    if (!initialLoggedIn) {
      setIsLoggedIn(false);
      setDisplayName(null);
      return;
    }

    setIsLoggedIn(true);
    if (initialDisplayName) {
      setDisplayName(initialDisplayName);
    }
  }, [initialLoggedIn, initialDisplayName]);

  const openLogin = useCallback((options?: OpenLoginOptions) => {
    setRedirectTo(options?.redirectTo ?? '/panel');
    setLoginOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setLoginOpen(false);
  }, []);

  const markLoggedIn = useCallback((name?: string) => {
    setIsLoggedIn(true);
    if (name) setDisplayName(name);
    setLoginOpen(false);
  }, []);

  const markLoggedOut = useCallback(() => {
    setIsLoggedIn(false);
    setDisplayName(null);
  }, []);

  const value = useMemo(
    () => ({
      isLoggedIn,
      displayName,
      loginOpen,
      redirectTo,
      openLogin,
      closeLogin,
      markLoggedIn,
      markLoggedOut,
    }),
    [isLoggedIn, displayName, loginOpen, redirectTo, openLogin, closeLogin, markLoggedIn, markLoggedOut],
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
