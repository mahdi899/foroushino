'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/cn';
import { familyMotion } from '@/lib/family/motion';

type FamilyGlassCtaButtonProps = {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
} & (
  | { href: string; onClick?: never; type?: never }
  | { href?: never; onClick?: () => void; type?: 'button' | 'submit' }
);

export function FamilyGlassCtaButton({
  children,
  className,
  disabled,
  href,
  onClick,
  type = 'button',
}: FamilyGlassCtaButtonProps) {
  const reduceMotion = useReducedMotion();
  const classes = cn('family-btn-glass', className);

  const inner = (
    <>
      <span className="family-btn-glass__sheen" aria-hidden />
      <span className="family-btn-glass__shimmer" aria-hidden />
      <span className="family-btn-glass__label">{children}</span>
      <ChevronLeft className="family-btn-glass__icon" strokeWidth={2.25} aria-hidden />
    </>
  );

  const motionProps = reduceMotion
    ? {}
    : {
        whileHover: { scale: 1.015, y: -1 },
        whileTap: { scale: 0.982, y: 0 },
        transition: familyMotion.spring,
      };

  if (href) {
    return (
      <motion.a href={href} className={classes} {...motionProps}>
        {inner}
      </motion.a>
    );
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      {...motionProps}
    >
      {inner}
    </motion.button>
  );
}
