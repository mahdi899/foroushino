import { cn } from "@/lib/cn";

/**
 * Compact ornamental flourish — gold taper lines and a small jewel with emerald bloom.
 * Use instead of a full-width hairline where a softer focal accent reads better.
 */
export function SectionMotif({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "mx-auto flex w-full max-w-[12rem] items-center justify-center gap-2 sm:max-w-[15rem] sm:gap-2.5",
        className,
      )}
    >
      <span className="h-px min-w-0 flex-1 bg-gradient-to-r from-gold/60 via-gold/25 to-transparent" />
      <span className="relative flex size-6 shrink-0 items-center justify-center">
        <span className="absolute size-5 rounded-full bg-emerald/25 blur-[10px]" />
        <span className="relative size-2 rotate-45 rounded-[3px] bg-gradient-to-br from-gold via-gold-soft to-gold/75 shadow-[0_0_16px_-3px_rgba(197,164,107,0.72)]" />
      </span>
      <span className="h-px min-w-0 flex-1 bg-gradient-to-l from-gold/60 via-gold/25 to-transparent" />
    </div>
  );
}
