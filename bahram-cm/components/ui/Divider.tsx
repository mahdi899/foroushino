"use client";

import { motion, useReducedMotion } from "framer-motion";

import { ease, dur, VIEWPORT_ONCE } from "@/components/motion/easings";
import { cn } from "@/lib/cn";

const PELLET =
  "absolute start-1/2 top-1/2 z-[1] h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_12px_2px_rgba(255,176,0,0.48)]";

/** A hairline divider with an optional gold pellet centered on it. */
export function Divider({
  className,
  gold = false,
  animateOnScroll = false,
}: {
  className?: string;
  gold?: boolean;
  /** Horizontal “open” (scale‑X) reveal when entering the viewport */
  animateOnScroll?: boolean;
}) {
  const reduce = useReducedMotion();
  const revealPellet = animateOnScroll && !reduce && gold;

  const goldPellet =
    gold &&
    (revealPellet ? (
      <motion.span
        aria-hidden
        className={PELLET}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={VIEWPORT_ONCE}
        transition={{ duration: dur.sm, ease: ease.enter, delay: dur.md * 0.45 }}
      />
    ) : (
      <span aria-hidden className={PELLET} />
    ));

  if (!animateOnScroll) {
    return (
      <div
        className={cn(
          "relative w-full",
          gold ? "hairline-gold" : "hairline",
          className,
        )}
      >
        {goldPellet}
      </div>
    );
  }

  return (
    <div className={cn("relative w-full min-h-[1px]", className)}>
      <motion.div
        aria-hidden
        className={cn(gold ? "hairline-gold" : "hairline")}
        initial={reduce ? { scaleX: 1 } : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={VIEWPORT_ONCE}
        transition={{ duration: dur.lg, ease: ease.luxe }}
        style={{ transformOrigin: "50% 50%" }}
      />
      {goldPellet}
    </div>
  );
}
