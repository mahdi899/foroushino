'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type AdminSaveBarState = {
  dirty: boolean;
  onSave: () => void | Promise<void>;
  saving?: boolean;
  label?: string;
  savedLabel?: string;
  message?: string;
  messageTone?: 'success' | 'error';
};

type AdminSaveBarContextValue = {
  bar: AdminSaveBarState | null;
  register: (bar: AdminSaveBarState | null) => void;
};

const AdminSaveBarContext = createContext<AdminSaveBarContextValue | null>(null);

export function AdminSaveBarProvider({ children }: { children: ReactNode }) {
  const [bar, setBar] = useState<AdminSaveBarState | null>(null);
  const register = useCallback((next: AdminSaveBarState | null) => {
    setBar(next);
  }, []);

  return (
    <AdminSaveBarContext.Provider value={{ bar, register }}>{children}</AdminSaveBarContext.Provider>
  );
}

export function useAdminSaveBarContext() {
  const ctx = useContext(AdminSaveBarContext);
  if (!ctx) {
    throw new Error('useAdminSaveBarContext must be used within AdminSaveBarProvider');
  }
  return ctx;
}

/** Register a sticky header save action while the page has unsaved edits. */
export function useAdminSaveBar(options: AdminSaveBarState) {
  const { register } = useAdminSaveBarContext();
  const onSaveRef = useRef(options.onSave);
  onSaveRef.current = options.onSave;

  useEffect(() => {
    if (!options.dirty) {
      register(null);
      return;
    }

    register({
      dirty: true,
      saving: options.saving,
      label: options.label,
      savedLabel: options.savedLabel,
      message: options.message,
      messageTone: options.messageTone,
      onSave: () => onSaveRef.current(),
    });

    return () => register(null);
  }, [
    options.dirty,
    options.saving,
    options.label,
    options.savedLabel,
    options.message,
    options.messageTone,
    register,
  ]);
}
