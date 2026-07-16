'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'family-pwa-install-dismissed';

/** Compact install CTA for the family PWA (Android beforeinstallprompt + iOS hint). */
export function FamilyInstallCard() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [showIosHint, setShowIosHint] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };

    window.addEventListener('beforeinstallprompt', onInstall);
    return () => window.removeEventListener('beforeinstallprompt', onInstall);
  }, []);

  if (installed || dismissed) return null;
  if (!installEvent && !isIos) return null;

  const handleInstall = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setInstallEvent(null);
      return;
    }
    setShowIosHint((v) => !v);
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="family-pwa-install pointer-events-auto fixed bottom-[max(1rem,env(safe-area-inset-bottom))] start-3 z-[60] max-w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-white/10 bg-[var(--family-surface,#132028)]/95 p-3 text-start shadow-lg backdrop-blur-md sm:start-auto sm:end-4">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[var(--family-accent,#3390ec)]">
          <Smartphone size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--family-fg,#e8eef2)]">نصب خانواده روی گوشی</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--family-muted,#8aa0ad)]">
            مثل اپ، سریع‌تر باز می‌شود و اعلان‌ها دم دست‌تان است.
          </p>
          {showIosHint ? (
            <p className="mt-2 text-xs text-[var(--family-muted,#8aa0ad)]">
              در Safari: Share → Add to Home Screen
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleInstall()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--family-accent,#3390ec)] px-3 py-1.5 text-xs font-medium text-white"
            >
              <Download size={14} aria-hidden />
              {isIos && !installEvent ? 'راهنمای نصب' : 'نصب'}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-[var(--family-muted,#8aa0ad)]"
              aria-label="بستن"
            >
              <X size={14} aria-hidden />
              بعداً
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
