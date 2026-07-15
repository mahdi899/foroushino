'use client';

import { Lock } from 'lucide-react';
import { FamilyBrandLogo } from '@/components/family/FamilyBrandLogo';
import { useFamilyGuestLogin } from '@/components/family/FamilyGuestAuth';
import { useFamilyBranding } from '@/lib/family/hooks/useFamilyBranding';

export function FeedPreviewIntro({ mode }: { mode: 'guest' | 'join' }) {
  const { branding } = useFamilyBranding();
  const { openLogin } = useFamilyGuestLogin();

  return (
    <div className="family-preview-intro mx-3 mb-1 px-4 py-4 sm:mx-4 lg:mx-5">
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
        <button
          type="button"
          onClick={openLogin}
          className="family-btn-primary mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold"
        >
          ورود به خانواده
        </button>
      )}
    </div>
  );
}

export function FeedPreviewGate({ mode }: { mode: 'guest' | 'join' }) {
  const { openLogin } = useFamilyGuestLogin();

  return (
    <div className="family-preview-gate flex flex-col items-center gap-3 px-5 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--family-tg-pinned-accent)_12%,transparent)] text-[var(--family-tg-pinned-accent)]">
        <Lock className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-bone">پیام‌های بیشتری در انتظارته</p>
        <p className="max-w-xs text-xs leading-relaxed text-bone/50">
          {mode === 'guest'
            ? 'با ورود به خانواده به همه پست‌ها، صداها، ویدیوها و نظرات دسترسی داری.'
            : 'با پیوستن به خانواده، همه محتوا و تعاملات باز می‌شه.'}
        </p>
      </div>
      {mode === 'guest' ? (
        <button
          type="button"
          onClick={openLogin}
          className="family-btn-primary flex w-full items-center justify-center rounded-xl py-3 text-sm font-bold"
        >
          ورود به خانواده
        </button>
      ) : (
        <a
          href="#family-join-cta"
          className="family-btn-primary flex w-full items-center justify-center rounded-xl py-3 text-sm font-bold"
        >
          بپیوند به خانواده
        </a>
      )}
    </div>
  );
}
