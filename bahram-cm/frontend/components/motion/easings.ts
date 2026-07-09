import type { Transition } from "framer-motion";

export const ease = {
  luxe: [0.16, 1, 0.3, 1] as const,
  enter: [0.22, 1, 0.36, 1] as const,
  exit: [0.7, 0, 0.84, 0] as const,
};

export const dur = {
  xs: 0.18,
  sm: 0.32,
  md: 0.6,
  lg: 0.9,
  xl: 1.4,
} as const;

export const transitions = {
  revealUp: {
    duration: dur.lg,
    ease: ease.luxe,
  } satisfies Transition,
  fade: {
    duration: dur.md,
    ease: ease.enter,
  } satisfies Transition,
  stagger: (delay = 0): Transition => ({
    duration: dur.lg,
    ease: ease.luxe,
    delay,
  }),
};

/** Content blocks — trigger once a meaningful slice is on screen, not when peeking from below. */
export const VIEWPORT_ONCE = {
  once: true,
  amount: 0.22,
  margin: "0px 0px -10% 0px",
} as const;

/** Full sections — cinematic entrance when the section actually arrives in view. */
export const VIEWPORT_SECTION = {
  once: true,
  amount: 0.15,
  margin: "0px 0px -6% 0px",
} as const;
