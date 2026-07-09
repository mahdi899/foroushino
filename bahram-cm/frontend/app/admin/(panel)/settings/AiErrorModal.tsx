'use client';

import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Copy, X } from 'lucide-react';
import type { AiErrorDetail } from '@/lib/ai/types';

interface AiErrorModalProps {
  open: boolean;
  onClose: () => void;
  detail: AiErrorDetail | null;
  success?: { model: string; provider?: string; saved?: boolean } | null;
}

export function AiErrorModal({ open, onClose, detail, success }: AiErrorModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isSuccess = Boolean(success);

  async function copyDetails() {
    if (!detail) return;
    const text = [
      `خلاصه: ${detail.summary}`,
      detail.provider && `ارائه‌دهنده: ${detail.provider}`,
      detail.model && `مدل: ${detail.model}`,
      detail.statusCode && `HTTP: ${detail.statusCode}`,
      detail.endpoint && `Endpoint: ${detail.endpoint}`,
      detail.keySource && `منبع کلید: ${detail.keySource}`,
      detail.hints?.length ? `\nراهنما:\n${detail.hints.map((h) => `- ${h}`).join('\n')}` : '',
      detail.rawResponse ? `\nپاسخ خام:\n${detail.rawResponse}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 admin-overlay" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-floating">
        <div className={`flex items-start gap-3 border-b border-border px-5 py-4 ${isSuccess ? 'bg-success/5' : 'bg-error/5'}`}>
          {isSuccess ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-primary-dark">
              {isSuccess ? 'اتصال موفق' : 'خطا در تست اتصال AI'}
            </p>
            <p className="mt-0.5 text-small text-text-muted">
              {isSuccess
                ? success?.saved === false
                  ? `مدل ${success?.model} پاسخ داد، اما کلید در پایگاه داده ذخیره نشد.`
                  : `مدل ${success?.model} پاسخ داد${success?.saved ? ' و تنظیمات ذخیره شد' : ''}.`
                : detail?.summary ?? 'خطای نامشخص'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-text-muted hover:bg-surface-soft hover:text-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        {detail && (!isSuccess || success?.saved === false) && (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
            {!isSuccess && (
              <dl className="grid gap-2 text-caption">
                {detail.provider && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-muted">ارائه‌دهنده</dt>
                    <dd className="font-medium text-text">{detail.provider}</dd>
                  </div>
                )}
                {detail.model && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-muted">مدل</dt>
                    <dd className="font-mono text-text" dir="ltr">{detail.model}</dd>
                  </div>
                )}
                {detail.statusCode != null && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-muted">کد HTTP</dt>
                    <dd className="font-mono text-text" dir="ltr">{detail.statusCode}</dd>
                  </div>
                )}
                {detail.keySource && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-muted">منبع کلید</dt>
                    <dd className="text-text">
                      {detail.keySource === 'panel' ? 'کلید وارد‌شده / ذخیره‌شده' : detail.keySource === 'env' ? 'env سرور' : 'ندارد'}
                    </dd>
                  </div>
                )}
                {detail.endpoint && (
                  <div>
                    <dt className="mb-1 text-text-muted">Endpoint</dt>
                    <dd className="break-all rounded-md bg-surface-soft px-2 py-1.5 font-mono admin-text-meta text-text" dir="ltr">
                      {detail.endpoint}
                    </dd>
                  </div>
                )}
              </dl>
            )}

            {detail.hints.length > 0 && (
              <div>
                <p className="mb-2 text-caption font-semibold text-primary-dark">راهنمای رفع مشکل</p>
                <ul className="space-y-1.5 text-caption text-text-muted">
                  {detail.hints.map((h) => (
                    <li key={h} className="flex gap-2">
                      <span className="text-accent">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!isSuccess && detail.rawResponse && (
              <div>
                <p className="mb-2 text-caption font-semibold text-primary-dark">پاسخ کامل API</p>
                <pre
                  dir="ltr"
                  className="max-h-48 overflow-auto rounded-lg border border-border bg-surface-soft p-3 font-mono admin-text-meta leading-relaxed text-text-muted"
                >
                  {detail.rawResponse}
                </pre>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          {detail && (!isSuccess || success?.saved === false) && (
            <button type="button" onClick={copyDetails} className="btn btn-secondary px-3 py-1.5 text-caption">
              <Copy className="h-3.5 w-3.5" />
              کپی جزئیات
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn-primary px-4 py-1.5 text-caption">
            {isSuccess ? 'باشه' : 'بستن'}
          </button>
        </div>
      </div>
    </div>
  );
}
