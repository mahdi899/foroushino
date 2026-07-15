import Link from 'next/link';

export function GuestBanner() {
  return (
    <div
      id="family-guest-cta"
      className="z-30 shrink-0 border-t border-[var(--family-border-subtle)] bg-[var(--family-surface)]/95 px-4 py-3 backdrop-blur-md sm:px-5 lg:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-[680px] items-center justify-between gap-3 lg:gap-4">
        <p className="text-start text-xs leading-relaxed text-bone/70 lg:text-sm">
          برای دیدن همه پیام‌ها، واکنش و نظر — وارد شو.
        </p>
        <Link
          href="/family/login?redirect=/family"
          className="family-btn-primary shrink-0 rounded-full px-4 py-2 text-xs font-bold transition lg:px-5 lg:py-2.5 lg:text-sm"
        >
          ورود
        </Link>
      </div>
    </div>
  );
}
