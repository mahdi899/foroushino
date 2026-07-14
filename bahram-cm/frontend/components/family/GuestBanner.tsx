import Link from 'next/link';

export function GuestBanner() {
  return (
    <div className="sticky bottom-0 z-30 shrink-0 border-t border-white/10 bg-charcoal/95 px-4 py-3 backdrop-blur-md sm:px-5 lg:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between gap-3 lg:gap-4">
        <p className="text-xs text-bone/70 lg:text-sm">برای واکنش، نظر و همراهی با خانواده وارد شو.</p>
        <Link
          href="/family/login"
          className="shrink-0 rounded-full bg-gold px-4 py-2 text-xs font-bold text-charcoal transition hover:bg-gold/90 active:scale-95 lg:px-5 lg:py-2.5 lg:text-sm"
        >
          ورود
        </Link>
      </div>
    </div>
  );
}
