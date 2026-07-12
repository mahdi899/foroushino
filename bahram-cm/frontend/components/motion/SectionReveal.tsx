"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { useIsMobileMotion } from "@/hooks/useIsMobileMotion";
import { ease, dur, durMobile, VIEWPORT_SECTION, VIEWPORT_SECTION_MOBILE } from "./easings";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/** Cinematic section entrance — fires when the block is actually in view, not on first pixel. */
export function SectionReveal({ children, className, delay = 0 }: Props) {
  const reduce = useReducedMotion();
  const isMobile = useIsMobileMotion();
  const light = isMobile && !reduce;

  const variants: Variants = {
    hidden: {
      opacity: 0,
      y: reduce ? 0 : light ? 18 : 48,
      scale: reduce || light ? 1 : 0.985,
    },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: light ? durMobile.xl : dur.xl,
        ease: ease.luxe,
        delay: light ? delay * 0.45 : delay,
      },
    },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={isMobile ? VIEWPORT_SECTION_MOBILE : VIEWPORT_SECTION}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}
