"use client";

import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { useRef, type ReactNode } from "react";
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
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, VIEWPORT_ONCE);

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
      ref={ref}
      className={className}
      initial="hidden"
      animate={reduce || inView ? "show" : "hidden"}
      variants={variants}
    >
      {children}
    </Component>
  );
}
