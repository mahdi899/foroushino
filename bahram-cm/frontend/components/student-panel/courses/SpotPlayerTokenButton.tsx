'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Download, KeyRound, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { SPOTPLAYER_PRIMARY_DOWNLOADS } from '@/lib/spotplayer/downloads';

export function SpotPlayerTokenButton({
  licenseKey,
  className,
}: {
  licenseKey: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(licenseKey.trim());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function close() {
    setOpen(false);
  }

  const dialog =
    mounted && open
      ? createPortal(
          <div className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-4" role="presentation">
            <button
              type="button"
              aria-label="بستن"
              className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
              onClick={close}
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="spotplayer-token-title"
              className="relative z-[1] flex max-h-[min(88dvh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-soft sm:rounded-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3.5 sm:px-5">
                <div className="min-w-0 text-right">
                  <p className="panel-text-caption font-semibold text-primary">اپلیکیشن SpotPlayer</p>
                  <h2 id="spotplayer-token-title" className="mt-0.5 text-base font-bold text-text">
                    مشاهده دوره در نرم‌افزار
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="بستن"
                  className="shrink-0 rounded-lg p-1.5 text-text-muted transition hover:bg-surface-soft hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
                <p className="panel-text-meta leading-relaxed text-text-muted">
                  دوره را در نرم‌افزار ویندوز یا اندروید باز کنید، نه در سایت پخش آنلاین. توکن را کپی کنید و داخل اپ وارد کنید.
                  {copied ? ' توکن کپی شد.' : ''}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {SPOTPLAYER_PRIMARY_DOWNLOADS.map((platform) => (
                    <a
                      key={platform.id}
                      href={platform.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-surface-soft/80 px-3 py-2.5 transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <img
                        src={platform.logo}
                        alt=""
                        width={36}
                        height={36}
                        className="h-9 w-9 shrink-0 object-contain"
                      />
                      <span className="min-w-0 text-right">
                        <span className="block text-sm font-semibold text-text">{platform.label}</span>
                        <span className="panel-text-caption inline-flex items-center gap-1 text-primary">
                          <Download className="h-3 w-3" />
                          دانلود اپ
                        </span>
                      </span>
                    </a>
                  ))}
                </div>

                <div>
                  <div className="panel-text-meta mb-2 flex items-center gap-1.5 font-medium text-text-muted">
                    <KeyRound className="h-3.5 w-3.5" />
                    توکن لایسنس
                  </div>
                  <code
                    className="panel-text-meta block max-h-28 overflow-y-auto break-all rounded-xl border border-border/60 bg-surface-soft px-3 py-2.5 leading-relaxed text-text"
                    dir="ltr"
                  >
                    {licenseKey}
                  </code>
                </div>
              </div>

              <div className="border-t border-border/70 p-4 sm:px-5">
                <button type="button" onClick={() => void copyToken()} className="btn btn-primary w-full">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'کپی شد' : 'کپی توکن'}
                </button>
              </div>
            </div>
          </div>,
          document.getElementById('panel-root') ?? document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void copyToken();
        }}
        className={cn('btn btn-primary w-full', className)}
      >
        <KeyRound size={16} />
        توکن و دانلود اپ
      </button>
      {dialog}
    </>
  );
}
