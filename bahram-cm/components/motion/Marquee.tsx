import type { ReactElement, ReactNode } from "react";
import { Children, cloneElement, isValidElement } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  /** Seconds for one full loop (half the duplicated track). */
  speed?: number;
  className?: string;
  /** When the document is RTL, default scroll matches common ticker direction. */
  direction?: "rtl" | "ltr";
};

/**
 * CSS-driven infinite marquee: linear, compositor-friendly, no JS tween restarts.
 * One flex row repeats all children twice with uniform gaps so translate -50%
 * moves exactly one copy — no stray gap between duplicate strips.
 */
export function Marquee({
  children,
  speed = 40,
  className,
  direction = "rtl",
}: Props) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement[];

  /** Enough chips per strip that narrow viewports still overflow the clip (avoids a dead band on one edge). */
  const minPerStrip = 12;
  const cycles =
    items.length === 0 ? 1 : Math.ceil(minPerStrip / items.length);
  const stripItems =
    items.length === 0 ? items : Array.from({ length: cycles }, () => items).flat();

  return (
    <div className={cn("relative min-w-0 overflow-hidden", className)} dir="ltr">
      {/* Track must be LTR: page `dir="rtl"` reverses flex + breaks the −50% loop seam.
          Two inner strips share no outer gap — otherwise total width ≠ 2×(one strip),
          so translate -50% drifts off the duplicate seam (“empty strip” before loop).
          Trailing padding on each strip replaces the lone inter-copy gap — full period = chips + gaps + tail space. */}
      <div
        dir="ltr"
        className={cn(
          "flex w-max shrink-0 flex-nowrap items-center gap-0",
          direction === "rtl" ? "animate-marquee-rtl" : "animate-marquee-ltr",
        )}
        style={{ "--marquee-duration": `${speed}s` } as React.CSSProperties}
      >
        <div className="flex shrink-0 flex-nowrap items-center gap-12 pe-12">
          {stripItems.map((child, i) =>
            cloneElement(child, { key: `marquee-${i}` }),
          )}
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-12 pe-12" aria-hidden>
          {stripItems.map((child, i) =>
            cloneElement(child, {
              key: `marquee-copy-${i}`,
            }),
          )}
        </div>
      </div>
    </div>
  );
}
