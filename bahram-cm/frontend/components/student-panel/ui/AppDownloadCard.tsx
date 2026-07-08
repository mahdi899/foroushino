'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AppDownloadCard({ compact = false }: { compact?: boolean }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
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
    };

    window.addEventListener('beforeinstallprompt', onInstall);
    return () => window.removeEventListener('beforeinstallprompt', onInstall);
  }, []);

  const isIos =
    typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  const handleInstall = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setInstallEvent(null);
      return;
    }

    if (isIos) {
      setShowIosHint((v) => !v);
    }
  };

  if (installed) {
    if (compact) {
      return (
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"
          title="اپلیکیشن نصب شده است"
        >
          <Smartphone size={18} />
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-border/60 bg-surface-soft p-4 text-center">
        <p className="text-xs font-semibold text-primary">اپلیکیشن نصب شده است</p>
        <p className="mt-1 text-[10px] text-text-muted">پنل آکادمی روی دستگاه شما فعال است.</p>
      </div>
    );
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void handleInstall()}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-surface-soft text-primary transition hover:border-primary/30 hover:bg-primary/10"
        title="نصب اپلیکیشن پنل"
        aria-label="نصب اپلیکیشن پنل"
      >
        <Smartphone size={18} />
      </button>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 to-accent/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-soft text-primary">
          <Smartphone size={20} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-xs font-bold text-primary">نصب اپلیکیشن پنل</span>
          <span className="text-[10px] leading-relaxed text-text-muted">
            پنل را مثل اپ روی گوشی نصب کن و سریع‌تر به دوره‌ها و اعلان‌ها دسترسی داشته باش.
          </span>
          {(installEvent || isIos) && (
            <button
              type="button"
              onClick={() => void handleInstall()}
              className="mt-1 flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-primary/15 py-2.5 text-xs font-semibold text-primary transition-all duration-300 hover:bg-primary/25 active:scale-[0.98]"
            >
              <Download size={14} />
              {isIos && !installEvent ? 'راهنمای نصب iOS' : 'نصب روی گوشی'}
            </button>
          )}
          {showIosHint ? (
            <div className="rounded-xl border border-border/60 bg-surface/80 p-2.5 text-[10px] leading-relaxed text-text-muted">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold text-text">نصب در Safari</span>
                <button type="button" onClick={() => setShowIosHint(false)} aria-label="بستن">
                  <X size={12} />
                </button>
              </div>
              دکمه Share را بزنید و گزینه «Add to Home Screen» را انتخاب کنید.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
