import Link from 'next/link';

export function GuestBanner() {
  return (
    <div
      id="family-guest-cta"
      className="z-30 shrink-0 border-t border-[var(--family-border-subtle)] bg-[var(--family-surface)]/95 px-4 py-3 backdrop-blur-md sm:px-5 lg:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-[680px] flex-col gap-2.5">
        <p className="text-center text-xs leading-relaxed text-bone/70 sm:text-start lg:text-sm">
          برای دیدن همه پیام‌ها، واکنش و نظر — وارد شو.
        </p>
        <Link
          href="/family/login?redirect=/family"
          className="family-btn-primary flex w-full items-center justify-center rounded-xl py-3 text-sm font-bold transition"
        >
          ورود به خانواده
        </Link>
      </div>
    </div>
  );
}
