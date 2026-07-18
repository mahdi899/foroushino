'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'site-pwa-install-dismissed';

/** Install CTA for the main site PWA (Android + iOS hint). */
export function SiteInstallCard() {
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

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

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

  return (
    <div className="pointer-events-auto fixed bottom-4 start-4 z-[55] max-w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-border/60 bg-surface/95 p-3 shadow-lg backdrop-blur-md">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Smartphone size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-primary-dark">نصب سایت روی گوشی</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">دسترسی سریع‌تر به مقالات و دوره‌ها</p>
          {showIosHint ? (
            <p className="mt-2 text-xs text-muted">در Safari: Share → Add to Home Screen</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn-primary text-xs" onClick={() => void handleInstall()}>
              <Download size={14} className="me-1 inline" />
              نصب
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={dismiss}>
              بعداً
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="text-muted" aria-label="بستن">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
