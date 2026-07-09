"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { ease, dur, VIEWPORT_SECTION } from "./easings";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/** Cinematic section entrance — fires when the block is actually in view, not on first pixel. */
export function SectionReveal({ children, className, delay = 0 }: Props) {
  const reduce = useReducedMotion();

  const variants: Variants = {
    hidden: {
      opacity: 0,
      y: reduce ? 0 : 48,
      scale: reduce ? 1 : 0.985,
    },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: dur.xl,
        ease: ease.luxe,
        delay,
      },
    },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT_SECTION}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}
