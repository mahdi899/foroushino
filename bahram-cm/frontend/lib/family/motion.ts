/** Shared motion tokens for the family channel (Telegram iOS feel). */
export const FAMILY_EASE = [0.22, 1, 0.36, 1] as const;

export const familyMotion = {
  spring: {
    type: 'spring' as const,
    stiffness: 380,
    damping: 30,
    mass: 0.82,
  },
  tween: {
    duration: 0.38,
    ease: FAMILY_EASE,
  },
  tweenFast: {
    duration: 0.28,
    ease: FAMILY_EASE,
  },
  stagger: 0.045,
  postEnter: (delay = 0) => ({
    initial: { opacity: 0, y: 16, scale: 0.985 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.42, ease: FAMILY_EASE, delay },
  }),
  fadeUp: (delay = 0) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.36, ease: FAMILY_EASE, delay },
  }),
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.24, ease: FAMILY_EASE },
  },
};
