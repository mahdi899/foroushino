"use client";

import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { ease, dur, VIEWPORT_ONCE } from "./easings";

type Props = {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
};

export function StaggerGroup({
  children,
  className,
  stagger = 0.08,
  delay = 0,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, VIEWPORT_ONCE);

  const parent: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduce ? 0 : stagger,
        delayChildren: delay,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={reduce || inView ? "show" : "hidden"}
      variants={parent}
    >
      {children}
    </motion.div>
  );
}

type ItemProps = {
  children: ReactNode;
  className?: string;
  y?: number;
};

export function StaggerItem({ children, className, y = 24 }: ItemProps) {
  const reduce = useReducedMotion();
  const variants: Variants = {
    hidden: {
      opacity: 0,
      y: reduce ? 0 : y,
      scale: reduce ? 1 : 0.97,
    },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: dur.lg, ease: ease.luxe },
    },
  };

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}
