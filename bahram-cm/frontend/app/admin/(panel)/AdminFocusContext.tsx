'use client';

import { createContext, useContext, useMemo, useState } from 'react';

interface AdminFocusContextValue {
  focusMode: boolean;
  setFocusMode: (value: boolean) => void;
  toggleFocusMode: () => void;
}

const AdminFocusContext = createContext<AdminFocusContextValue | null>(null);

export function AdminFocusProvider({ children }: { children: React.ReactNode }) {
  const [focusMode, setFocusMode] = useState(false);
  const value = useMemo(
    () => ({
      focusMode,
      setFocusMode,
      toggleFocusMode: () => setFocusMode((v) => !v),
    }),
    [focusMode],
  );
  return <AdminFocusContext.Provider value={value}>{children}</AdminFocusContext.Provider>;
}

export function useAdminFocus() {
  const ctx = useContext(AdminFocusContext);
  if (!ctx) throw new Error('useAdminFocus must be used within AdminFocusProvider');
  return ctx;
}
