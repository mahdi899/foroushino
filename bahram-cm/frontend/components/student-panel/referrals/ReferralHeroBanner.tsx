'use client';

import { useState } from 'react';
import { Check, Copy, Gift } from 'lucide-react';
import { AnimatedEmoji } from '@/components/emoji/AnimatedEmoji';

export function ReferralHeroBanner({ code, link }: { code: string; link: string }) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  function copy(value: string, type: 'code' | 'link') {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(type);
      window.setTimeout(() => setCopied(null), 1800);
    });
  }

  return (
    <section className="panel-referral-hero">
      <div className="panel-referral-hero__glow -left-6 top-0 h-32 w-32 opacity-60" style={{ background: 'var(--color-gold-soft)' }} />
      <div className="panel-referral-hero__glow -bottom-8 right-8 h-28 w-28 opacity-50" style={{ background: 'var(--color-primary-soft)' }} />

      <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="panel-referral-hero__icon" aria-hidden>
              <Gift size={20} strokeWidth={2} />
            </span>
            <span className="text-sm font-semibold text-text-muted">باشگاه مشتریان</span>
          </div>
          <h1 className="text-2xl font-bold leading-tight text-text sm:text-3xl">
            کش‌بک برای هر معرفی موفق
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-text-muted">
            لینک یا کد اختصاصی‌ات را به اشتراک بگذار؛ با هر خرید موفق، پاداش نقدی بر اساس محصول خریداری‌شده دریافت می‌کنی.
          </p>
        </div>

        <div className="panel-referral-hero__gift lg:self-auto">
          <AnimatedEmoji notoKey="gift" size={56} mode="loop" label="هدیه" />
        </div>
      </div>

      <div className="relative z-10 mt-6 grid gap-3 sm:grid-cols-2">
        <div className="panel-referral-hero__field">
          <p className="panel-text-meta mb-2 text-text-muted">کد اختصاصی شما</p>
          <div className="flex items-center justify-between gap-2">
            <span className="tabular-nums text-lg font-bold text-text" dir="ltr">{code}</span>
            <button type="button" onClick={() => copy(code, 'code')} className="btn btn-secondary panel-text-caption min-h-9 py-1">
              {copied === 'code' ? <Check size={14} /> : <Copy size={14} />}
              {copied === 'code' ? 'کپی شد' : 'کپی'}
            </button>
          </div>
        </div>

        <div className="panel-referral-hero__field">
          <p className="panel-text-meta mb-2 text-text-muted">لینک دعوت شما</p>
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm text-text" dir="ltr">{link}</span>
            <button type="button" onClick={() => copy(link, 'link')} className="btn btn-secondary panel-text-caption min-h-9 shrink-0 py-1">
              {copied === 'link' ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
