'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { FamilyBrandLogo } from '@/components/family/FamilyBrandLogo';
import { useFamilyBranding } from '@/lib/family/hooks/useFamilyBranding';

export function FeedPreviewIntro({ mode }: { mode: 'guest' | 'join' }) {
  const { branding } = useFamilyBranding();

  return (
    <div className="family-preview-intro mx-3 mb-1 rounded-2xl border px-4 py-4 sm:mx-4 lg:mx-5">
      <div className="flex items-start gap-3">
        <FamilyBrandLogo className="shrink-0" size="sm" />
        <div className="min-w-0 flex-1 text-start">
          <p className="text-sm font-bold text-bone">{branding.display_name}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-bone/55">
            نمونه‌ای از پیام‌های اخیر {branding.profile_name}. برای دسترسی کامل{' '}
            {mode === 'guest' ? 'وارد شو' : 'به خانواده بپیوند'}.
          </p>
        </div>
      </div>
      {mode === 'guest' && (
        <Link
          href="/family/login?redirect=/family"
          className="family-btn-primary mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold"
        >
          ورود و دیدن همه پیام‌ها
        </Link>
      )}
    </div>
  );
}

export function FeedPreviewGate({ mode }: { mode: 'guest' | 'join' }) {
  return (
    <div className="family-preview-gate flex flex-col items-center gap-3 rounded-2xl border border-dashed px-5 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-gold/80">
        <Lock className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-bone">پیام‌های بیشتری در انتظارته</p>
        <p className="max-w-xs text-xs leading-relaxed text-bone/50">
          {mode === 'guest'
            ? 'با ورود به همه پست‌ها، صداها، ویدیوها و نظرات دسترسی داری.'
            : 'با پیوستن به خانواده، همه محتوا و تعاملات باز می‌شه.'}
        </p>
      </div>
      {mode === 'guest' ? (
        <Link
          href="/family/login?redirect=/family"
          className="family-btn-primary rounded-full px-5 py-2.5 text-sm font-bold"
        >
          ورود
        </Link>
      ) : (
        <a
          href="#family-join-cta"
          className="family-btn-primary rounded-full px-5 py-2.5 text-sm font-bold"
        >
          بپیوند به خانواده
        </a>
      )}
    </div>
  );
}
