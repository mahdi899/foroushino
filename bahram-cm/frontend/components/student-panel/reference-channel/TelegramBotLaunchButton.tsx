'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, ShieldAlert, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const TRACE_ENDPOINTS = ['/cdn-cgi/trace', 'https://www.cloudflare.com/cdn-cgi/trace'];

function parseTraceLocation(body: string): string | null {
  for (const line of body.split('\n')) {
    const [key, value] = line.split('=');
    if (key?.trim() === 'loc' && value) return value.trim().toUpperCase();
  }
  return null;
}

async function detectIranIp(signal: AbortSignal): Promise<boolean> {
  for (const endpoint of TRACE_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, { signal, cache: 'no-store' });
      if (!response.ok) continue;
      const loc = parseTraceLocation(await response.text());
      if (loc) return loc === 'IR';
    } catch {
      // try next endpoint
    }
  }
  return false;
}

export function TelegramBotLaunchButton({
  href,
  label = 'ورود سریع به ربات تلگرام',
  className = 'btn btn-primary w-full',
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  const [isIranIp, setIsIranIp] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const recheckingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    void detectIranIp(controller.signal).then((iran) => {
      if (!controller.signal.aborted) setIsIranIp(iran);
    });
    return () => controller.abort();
  }, []);

  const openBot = useCallback(() => {
    window.open(href, '_blank', 'noopener,noreferrer');
  }, [href]);

  const handleRecheck = useCallback(async () => {
    if (recheckingRef.current) return;
    recheckingRef.current = true;
    const controller = new AbortController();
    const iran = await detectIranIp(controller.signal);
    recheckingRef.current = false;
    setIsIranIp(iran);
    if (!iran) {
      setWarningOpen(false);
      openBot();
    }
  }, [openBot]);

  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={className}
        onClick={(event) => {
          if (!isIranIp) return;
          event.preventDefault();
          setWarningOpen(true);
        }}
      >
        <ExternalLink size={16} />
        {label}
      </a>

      <AnimatePresence>
        {warningOpen ? (
          <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              aria-label="بستن"
              onClick={() => setWarningOpen(false)}
            />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="telegram-vpn-warning-title"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-premium"
              dir="rtl"
            >
              <div className="flex items-start justify-between gap-2 border-b border-border/50 px-4 py-3">
                <p id="telegram-vpn-warning-title" className="flex items-center gap-2 text-sm font-bold">
                  <ShieldAlert size={18} className="text-amber-500" aria-hidden />
                  فیلترشکن خاموش است
                </p>
                <button
                  type="button"
                  onClick={() => setWarningOpen(false)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-text-muted transition hover:bg-surface-soft"
                  aria-label="بستن"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 p-4">
                <p className="text-[13px] leading-7 text-text-muted">
                  به نظر می‌رسد با آی‌پی ایران متصل هستید. برای باز شدن ربات تلگرام باید ابتدا
                  فیلترشکن خود را روشن کنید، سپس دوباره تلاش کنید.
                </p>

                <button type="button" onClick={() => void handleRecheck()} className="btn btn-primary w-full">
                  فیلترشکن را روشن کردم؛ بررسی دوباره
                </button>

                <button type="button" onClick={openBot} className="btn btn-ghost w-full">
                  با این حال ادامه می‌دهم
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
