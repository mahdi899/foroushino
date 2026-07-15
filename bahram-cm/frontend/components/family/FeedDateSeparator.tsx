'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { familyMotion } from '@/lib/family/motion';

export function FeedDateSeparator({ label }: { label: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="family-feed-date">
      <motion.span
        className="family-date-pill"
        initial={reduceMotion ? false : familyMotion.fadeUp().initial}
        animate={familyMotion.fadeUp().animate}
        transition={familyMotion.fadeUp().transition}
      >
        {label}
      </motion.span>
    </div>
  );
}
