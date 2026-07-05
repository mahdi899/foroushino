"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useMotionTemplate,
  useReducedMotion,
} from "framer-motion";
import { useEffect } from "react";
import { useDataTheme } from "@/lib/useDataTheme";

type Props = {
  /** Radius of the glow in px */
  size?: number;
  /** Override RGBA center color (defaults to Saat Teal per theme) */
  color?: string;
  className?: string;
};

/** Saat Teal cursor bloom — matches `--color-emerald` / `--color-emerald-glow` tokens */
function cursorGlowColor(theme: "light" | "dark"): string {
  return theme === "light"
    ? "rgba(0, 111, 117, 0.10)"
    : "rgba(0, 140, 150, 0.18)";
}

/**
 * A subtle mouse-following radial glow. Pointer-events: none. Only renders
 * on devices that report a fine pointer (desktop). Honors reduced motion.
 */
export function CursorGlow({
  size = 520,
  color,
  className,
}: Props) {
  const dataTheme = useDataTheme();
  const resolvedColor = color ?? cursorGlowColor(dataTheme);
  const reduce = useReducedMotion();
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const sx = useSpring(x, { stiffness: 80, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 80, damping: 18, mass: 0.6 });
  const background = useMotionTemplate`radial-gradient(${size}px circle at ${sx}px ${sy}px, ${resolvedColor}, transparent 60%)`;

  useEffect(() => {
    if (reduce) return;
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: fine)");
    if (!mq.matches) return;

    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [x, y, reduce]);

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden
      className={
        "pointer-events-none absolute inset-0 z-[1] hidden md:block " +
        (className ?? "")
      }
      style={{ background }}
    />
  );
}
