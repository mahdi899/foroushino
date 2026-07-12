"use client";

import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useIsMobileMotion } from "@/hooks/useIsMobileMotion";
import { ease, dur, durMobile, VIEWPORT_ONCE, VIEWPORT_ONCE_MOBILE } from "./easings";

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
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobileMotion();
  const [motionReady, setMotionReady] = useState(false);
  const inView = useInView(ref, isMobile ? VIEWPORT_ONCE_MOBILE : VIEWPORT_ONCE);

  useEffect(() => {
    setMotionReady(true);
  }, []);

  // SSR + first paint: no transform (matches reduced-motion) to avoid hydration mismatch.
  const reduce = !motionReady || prefersReducedMotion;
  const light = isMobile && !reduce;
  const travelY = reduce ? 0 : light ? Math.min(y, 14) : y;

  const variants: Variants = {
    hidden: {
      opacity: 0,
      y: travelY,
      scale: reduce || light ? 1 : 0.97,
    },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: light ? durMobile.lg : dur.lg,
        ease: ease.luxe,
        delay: light ? delay * 0.5 : delay,
      },
    },
  };

  const Component = motion[as] as typeof motion.div;

  return (
    <Component
      ref={ref as never}
      className={className}
      initial="hidden"
      animate={reduce || inView ? "show" : "hidden"}
      variants={variants}
    >
      {children}
    </Component>
  );
}
