'use client';

import { useFamilyGuestLogin } from '@/components/family/FamilyGuestAuth';

export function GuestBanner() {
  const { openLogin } = useFamilyGuestLogin();

  return (
    <div
      id="family-guest-cta"
      className="family-glass-bar z-30 shrink-0 px-4 py-3 sm:px-5 lg:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-[680px] flex-col gap-2">
        <p className="text-center text-xs text-[var(--family-tg-subtitle)]">برای دسترسی کامل باید وارد بشی</p>
        <button
          type="button"
          onClick={openLogin}
          className="family-btn-primary flex w-full items-center justify-center rounded-xl py-3 text-sm font-bold transition"
        >
          ورود به خانواده
        </button>
      </div>
    </div>
  );
}
