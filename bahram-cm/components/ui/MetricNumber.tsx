"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { toPersianDigits } from "@/lib/persian";
import { cn } from "@/lib/cn";

type Props = {
  /** A display value like "700K+", "50,000+", or "10". */
  value: string;
  /** Force-disable count animation for tiny numbers. */
  animateCount?: boolean;
  className?: string;
};

/**
 * Cinematic metric display. Detects a leading numeric portion and a
 * trailing suffix (e.g. "K+"), counts the number up once when in view,
 * and renders the number in Persian digits while keeping the suffix as-is.
 */
export function MetricNumber({ value, animateCount = true, className }: Props) {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(rootRef, { once: true, amount: 0.6 });

  // Parse number portion and suffix
  const m = value.match(/^([\d.,]+)(.*)$/);
  const numericStr = m?.[1] ?? value;
  const suffix = m?.[2] ?? "";
  const target = Number(numericStr.replace(/,/g, "")) || 0;
  const hasNumeric = m !== null && target > 0;

  useEffect(() => {
    const node = valueRef.current;
    if (!node) return;

    if (!inView || !hasNumeric || !animateCount || reduce) {
      node.textContent = toPersianDigits(numericStr).replace(/,/g, "٬");
      return;
    }

    const controls = animate(0, target, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        const rounded = Math.round(v);
        const withSeparators = rounded.toLocaleString("en-US");
        node.textContent = toPersianDigits(withSeparators).replace(/,/g, "٬");
      },
    });
    return () => controls.stop();
  }, [inView, hasNumeric, animateCount, reduce, target, numericStr]);

  return (
    <span
      ref={rootRef}
      dir="ltr"
      className={cn(
        "num-latin inline-flex items-baseline tabular-nums [unicode-bidi:isolate]",
        className,
      )}
    >
      <span ref={valueRef}>{toPersianDigits(numericStr).replace(/,/g, "٬")}</span>
      {suffix && <span className="ms-0.5 text-bone-dim">{suffix}</span>}
    </span>
  );
}
