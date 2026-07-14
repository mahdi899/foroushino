import Link from 'next/link';

export function GuestBanner() {
  return (
    <div className="sticky bottom-0 z-30 border-t border-white/10 bg-charcoal/95 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-bone/70">برای واکنش، نظر و همراهی با خانواده وارد شو.</p>
        <Link
          href="/family/login"
          className="shrink-0 rounded-full bg-gold px-4 py-2 text-xs font-bold text-charcoal transition active:scale-95"
        >
          ورود
        </Link>
      </div>
    </div>
  );
}
