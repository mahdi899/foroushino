'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type OpenLoginOptions = {
  redirectTo?: string;
};

type StudentAuthContextValue = {
  isLoggedIn: boolean;
  loginOpen: boolean;
  redirectTo: string;
  openLogin: (options?: OpenLoginOptions) => void;
  closeLogin: () => void;
  markLoggedIn: () => void;
  markLoggedOut: () => void;
};

const StudentAuthContext = createContext<StudentAuthContextValue | null>(null);

export function StudentAuthProvider({
  children,
  initialLoggedIn = false,
}: {
  children: React.ReactNode;
  initialLoggedIn?: boolean;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoggedIn);
  const [loginOpen, setLoginOpen] = useState(false);
  const [redirectTo, setRedirectTo] = useState('/panel');

  const openLogin = useCallback((options?: OpenLoginOptions) => {
    setRedirectTo(options?.redirectTo ?? '/panel');
    setLoginOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setLoginOpen(false);
  }, []);

  const markLoggedIn = useCallback(() => {
    setIsLoggedIn(true);
    setLoginOpen(false);
  }, []);

  const markLoggedOut = useCallback(() => {
    setIsLoggedIn(false);
  }, []);

  const value = useMemo(
    () => ({
      isLoggedIn,
      loginOpen,
      redirectTo,
      openLogin,
      closeLogin,
      markLoggedIn,
      markLoggedOut,
    }),
    [isLoggedIn, loginOpen, redirectTo, openLogin, closeLogin, markLoggedIn, markLoggedOut],
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
