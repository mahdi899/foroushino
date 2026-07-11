'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type PanelToastTone = 'success' | 'error' | 'info';

export type PanelToastInput = {
  message: string;
  title?: string;
  tone?: PanelToastTone;
  durationMs?: number;
};

type PanelToast = PanelToastInput & {
  id: string;
  tone: PanelToastTone;
  durationMs: number;
};

type PanelToastContextValue = {
  showToast: (input: PanelToastInput) => string;
  dismissToast: (id: string) => void;
};

const DEFAULT_DURATION_MS = {
  success: 4_500,
  error: 6_500,
  info: 5_000,
} as const;

const DEFAULT_TITLES = {
  success: 'انجام شد',
  error: 'خطا',
  info: 'اطلاع',
} as const;

const PanelToastContext = createContext<PanelToastContextValue | null>(null);

function PanelToastItem({ toast, onDismiss }: { toast: PanelToast; onDismiss: (id: string) => void }) {
  const Icon = toast.tone === 'success' ? CheckCircle2 : toast.tone === 'error' ? AlertCircle : Info;

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast.durationMs, toast.id]);

  return (
    <div
      className={cn('panel-feedback-toast', `panel-feedback-toast--${toast.tone}`)}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div className="panel-feedback-toast__body">
        <span className="panel-feedback-toast__icon" aria-hidden>
          <Icon size={18} strokeWidth={2.25} />
        </span>
        <div className="panel-feedback-toast__copy">
          <p className="panel-feedback-toast__title">{toast.title ?? DEFAULT_TITLES[toast.tone]}</p>
          <p className="panel-feedback-toast__message">{toast.message}</p>
        </div>
      </div>
      <button
        type="button"
        className="panel-feedback-toast__close"
        aria-label="بستن پیام"
        onClick={() => onDismiss(toast.id)}
      >
        <X size={16} />
      </button>
    </div>
  );
}

function PanelToastStack({ toasts, onDismiss }: { toasts: PanelToast[]; onDismiss: (id: string) => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || toasts.length === 0) return null;

  return createPortal(
    <div className="panel-feedback-toast-region" aria-label="پیام‌های سیستم">
      {toasts.map((toast) => (
        <PanelToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.getElementById('panel-root') ?? document.body,
  );
}

export function PanelToastProvider({ children }: { children: ReactNode }) {
  const seed = useId();
  const [toasts, setToasts] = useState<PanelToast[]>([]);
  const [seq, setSeq] = useState(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((input: PanelToastInput) => {
    const tone = input.tone ?? 'info';
    const id = `${seed}-${seq}`;
    setSeq((value) => value + 1);
    const toast: PanelToast = {
      id,
      message: input.message,
      title: input.title,
      tone,
      durationMs: input.durationMs ?? DEFAULT_DURATION_MS[tone],
    };
    setToasts((prev) => [...prev.filter((item) => item.message !== toast.message || item.tone !== toast.tone), toast].slice(-4));
    return id;
  }, [seed, seq]);

  const value = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast]);

  return (
    <PanelToastContext.Provider value={value}>
      {children}
      <PanelToastStack toasts={toasts} onDismiss={dismissToast} />
    </PanelToastContext.Provider>
  );
}

export function usePanelToast() {
  const context = useContext(PanelToastContext);
  if (!context) {
    throw new Error('usePanelToast must be used within PanelToastProvider');
  }
  return context;
}
