'use client';

import { useState } from 'react';
import { Check, Copy, Gift } from 'lucide-react';

export function ReferralHeroBanner({ code, link }: { code: string; link: string }) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  function copy(value: string, type: 'code' | 'link') {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(type);
      window.setTimeout(() => setCopied(null), 1800);
    });
  }

  return (
    <section className="relative overflow-hidden rounded-2xl p-5 sm:p-6" style={{ background: 'linear-gradient(135deg, var(--color-gold-soft), rgba(201,147,10,0.04))' }}>
      <div className="relative z-10">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl" style={{ background: 'var(--color-gold-soft)', color: 'var(--color-gold)' }}>
            <Gift size={22} />
          </span>
          <div>
            <h1 className="text-lg font-bold text-text">باشگاه مشتریان</h1>
            <p className="text-sm text-text-muted">لینک اختصاصی‌ات را به اشتراک بگذار و کش‌بک بگیر.</p>
          </div>
        </div>

        <div className="panel-copy-field p-2">
          <span className="min-w-0 flex-1 truncate text-sm text-text" dir="ltr">{link}</span>
          <button type="button" onClick={() => copy(link, 'link')} className="btn btn-secondary min-h-9 shrink-0 py-1 text-xs">
            {copied === 'link' ? <Check size={14} /> : <Copy size={14} />}
            {copied === 'link' ? 'کپی شد' : 'کپی لینک'}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-text-muted">کد اختصاصی:</span>
          <span className="rounded-lg px-3 py-1 font-mono font-bold" style={{ background: 'var(--color-gold-soft)', color: 'var(--color-gold)' }}>{code}</span>
          <button type="button" onClick={() => copy(code, 'code')} className="text-xs text-primary hover:underline">
            {copied === 'code' ? 'کپی شد' : 'کپی کد'}
          </button>
        </div>
      </div>
      <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full opacity-25 blur-3xl" style={{ background: 'var(--color-gold)' }} />
    </section>
  );
}
