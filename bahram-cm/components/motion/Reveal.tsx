"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { ease, dur, VIEWPORT_ONCE } from "./easings";

type Props = {
  children: ReactNode;
  delay?: number;
  y?: number;
  as?: "div" | "section" | "article" | "header" | "h1" | "h2" | "h3" | "p" | "span" | "li";
  className?: string;
};

export function Reveal({
  children,
  delay = 0,
  y = 28,
  as = "div",
  className,
}: Props) {
  const reduce = useReducedMotion();

  const variants: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : y },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: dur.lg, ease: ease.luxe, delay },
    },
  };

  const Component = motion[as] as typeof motion.div;

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT_ONCE}
      variants={variants}
    >
      {children}
    </Component>
  );
}
