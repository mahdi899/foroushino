'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import { FamilyBodyPortal } from '@/components/family/FamilyBodyPortal';
import { FamilyReactionLottie } from '@/components/family/FamilyReactionLottie';
import type { FamilyReactionType } from '@/lib/family/types';

export type ReactionFlyBurstPayload = {
  id: number;
  type: FamilyReactionType;
  from: { x: number; y: number };
  to: { x: number; y: number };
};

const FLY_DURATION = 0.78;
const FLY_SCALE_DURATION = 0.84;
const FLY_EMOJI_SIZE = 44;
const BAR_EMOJI_SIZE = 18;
const LAND_SCALE = BAR_EMOJI_SIZE / FLY_EMOJI_SIZE;

export function ReactionFlyBurst({
  anim,
  onComplete,
}: {
  anim: ReactionFlyBurstPayload;
  onComplete: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const arcLift = Math.max(56, Math.abs(anim.from.y - anim.to.y) * 0.22);

  useEffect(() => {
    if (!reduceMotion) return;
    onComplete();
  }, [onComplete, reduceMotion]);

  if (reduceMotion) return null;

  return (
    <FamilyBodyPortal>
      <motion.div
        className="family-reaction-fly"
        aria-hidden
        initial={{
          left: anim.from.x,
          top: anim.from.y,
          x: '-50%',
          y: '-50%',
          scale: 1.35,
          opacity: 1,
          rotate: -12,
        }}
        animate={{
          left: anim.to.x,
          top: [anim.from.y, Math.min(anim.from.y, anim.to.y) - arcLift, anim.to.y],
          scale: [1.35, 1.95, 0.82, LAND_SCALE * 1.12, LAND_SCALE],
          rotate: [0, -28, 18, -4, 0],
          opacity: 1,
        }}
        transition={{
          left: { duration: FLY_DURATION, ease: [0.16, 1, 0.28, 1] },
          top: {
            duration: FLY_DURATION,
            times: [0, 0.42, 1],
            ease: [0.45, 0, 0.2, 1],
          },
          scale: {
            duration: FLY_SCALE_DURATION,
            times: [0, 0.4, 0.62, 0.88, 1],
            ease: [0.34, 1.75, 0.64, 1],
          },
          rotate: { duration: FLY_DURATION, ease: 'easeOut' },
        }}
        onAnimationComplete={onComplete}
      >
        <span className="family-reaction-fly__glow" aria-hidden />
        <span className="family-reaction-fly__trail" aria-hidden />
        <FamilyReactionLottie type={anim.type} size={FLY_EMOJI_SIZE} mode="loop" />
      </motion.div>
    </FamilyBodyPortal>
  );
}
