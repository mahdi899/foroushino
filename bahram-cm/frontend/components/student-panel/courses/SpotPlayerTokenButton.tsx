'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export function SpotPlayerTokenButton({
  licenseKey,
  className,
}: {
  licenseKey: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(licenseKey.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void copyToken();
          setOpen(true);
        }}
        className={cn('btn btn-primary w-full', className)}
      >
        <KeyRound size={16} />
        کپی توکن اسپات‌پلیر
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-sm p-5 text-right"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-base font-bold text-text">مشاهده دوره در اسپات‌پلیر</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="بستن"
                className="rounded-lg p-1 text-text-muted transition hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="panel-text-meta mb-4 leading-relaxed text-text-muted">
              برای مشاهده دوره وارد برنامه اسپات‌پلیر شوید و این توکن را وارد کنید.
              {copied ? ' توکن در حافظه کپی شد.' : ''}
            </p>

            <code
              className="panel-text-meta block break-all rounded-xl border border-border/60 bg-surface-soft px-3 py-2.5 leading-relaxed text-text"
              dir="ltr"
            >
              {licenseKey}
            </code>

            <button
              type="button"
              onClick={() => void copyToken()}
              className="btn btn-primary mt-4 w-full"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'کپی شد' : 'کپی توکن'}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
