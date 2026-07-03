"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useMotionTemplate,
  useReducedMotion,
} from "framer-motion";
import { useEffect } from "react";

type Props = {
  /** Radius of the glow in px */
  size?: number;
  /** RGBA color of the glow center */
  color?: string;
  className?: string;
};

/**
 * A subtle mouse-following radial glow. Pointer-events: none. Only renders
 * on devices that report a fine pointer (desktop). Honors reduced motion.
 */
export function CursorGlow({
  size = 520,
  color = "rgba(0,140,150,0.18)",
  className,
}: Props) {
  const reduce = useReducedMotion();
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const sx = useSpring(x, { stiffness: 80, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 80, damping: 18, mass: 0.6 });
  const background = useMotionTemplate`radial-gradient(${size}px circle at ${sx}px ${sy}px, ${color}, transparent 60%)`;

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
