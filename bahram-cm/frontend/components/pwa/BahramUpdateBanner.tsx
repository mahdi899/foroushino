'use client';

import { RefreshCw, ShieldAlert, Sparkles, X } from 'lucide-react';
import { useBahramAppVersion } from '@/lib/pwa/useBahramAppVersion';

type Variant = 'site' | 'family' | 'panel';

const ACCENT: Record<Variant, string> = {
  site: '#0b0f10',
  family: '#3390ec',
  panel: '#008c96',
};

export function BahramUpdateBanner({ variant = 'site' }: { variant?: Variant }) {
  const { hasUpdate, updateType, latestVersion, applyUpdate, dismissUpdate } = useBahramAppVersion();

  if (!hasUpdate || updateType === 'silent') return null;

  const accent = ACCENT[variant];

  if (updateType === 'forced') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-6 backdrop-blur-md">
        <div
          className="relative w-full max-w-sm overflow-hidden rounded-3xl p-6 text-center text-white shadow-2xl"
          style={{ background: `linear-gradient(135deg, ${accent}, #1a1a1a)` }}
        >
          <ShieldAlert className="mx-auto mb-4 h-10 w-10" />
          <h3 className="mb-2 text-xl font-bold">بروزرسانی اجباری</h3>
          <p className="mb-6 text-sm leading-relaxed text-white/80">
            نسخه جدید <span className="font-bold text-white">{latestVersion}</span> منتشر شده است. برای ادامه باید
            بروزرسانی کنید.
          </p>
          <button
            type="button"
            onClick={() => void applyUpdate()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold"
            style={{ color: accent }}
          >
            <RefreshCw className="h-4 w-4" />
            بروزرسانی الان
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[9998] flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-white/10 p-4 text-white shadow-xl backdrop-blur-md"
        style={{ background: `linear-gradient(135deg, ${accent}ee, #111827ee)` }}
      >
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">نسخه جدید آماده است</p>
          <p className="mt-0.5 text-xs text-white/75">نسخه {latestVersion} — برای دریافت آخرین تغییرات بروزرسانی کنید.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void applyUpdate()}
              className="rounded-xl bg-white px-3 py-2 text-xs font-bold"
              style={{ color: accent }}
            >
              بروزرسانی
            </button>
            <button
              type="button"
              onClick={dismissUpdate}
              className="rounded-xl border border-white/20 px-3 py-2 text-xs font-medium text-white/90"
            >
              بعداً
            </button>
          </div>
        </div>
        <button type="button" onClick={dismissUpdate} className="shrink-0 text-white/70" aria-label="بستن">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
