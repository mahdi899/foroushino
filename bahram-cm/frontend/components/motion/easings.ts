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

/** Shorter durations for mobile — less GPU work, snappier feel. */
export const durMobile = {
  xs: 0.12,
  sm: 0.22,
  md: 0.38,
  lg: 0.52,
  xl: 0.72,
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

/** Mobile — trigger earlier with less scroll margin for faster perceived motion. */
export const VIEWPORT_ONCE_MOBILE = {
  once: true,
  amount: 0.12,
  margin: "0px 0px -4% 0px",
} as const;

export const VIEWPORT_SECTION_MOBILE = {
  once: true,
  amount: 0.1,
  margin: "0px 0px -3% 0px",
} as const;
