'use client';

import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ease, dur } from '@/components/motion/easings';

const DIGITS = ['۴', '۰', '۴'] as const;
const RING_SIZES = [4.5, 6, 7.5] as const;

/** Lost-route animation for the public 404 page. */
export function NotFoundAnimation() {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const trailId = `nf-trail-${uid}`;

  return (
    <motion.div
      className="relative mx-auto mb-2 h-56 w-full max-w-[20rem] sm:h-64"
      aria-hidden
      initial={{ opacity: 0, scale: reduce ? 1 : 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: dur.lg, ease: ease.luxe }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.75rem]">
        <div className="absolute left-1/2 top-[40%] h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald/12 blur-3xl" />
        <div className="absolute left-1/2 top-[36%] h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/10 blur-2xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--color-bone) 14%, transparent) 1px, transparent 0)',
            backgroundSize: '18px 18px',
          }}
        />
      </div>

      {RING_SIZES.map((size, index) => (
        <motion.div
          key={size}
          className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald/10"
          style={{ width: `${size}rem`, height: `${size}rem` }}
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: dur.md, ease: ease.luxe, delay: 0.08 + index * 0.07 }}
        />
      ))}

      {!reduce &&
        [0, 1].map((ring) => (
          <motion.div
            key={ring}
            className="absolute left-1/2 top-[40%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald/18"
            initial={{ scale: 0.55, opacity: 0.45 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 3.8, repeat: Infinity, delay: ring * 1.6, ease: 'easeOut' }}
          />
        ))}

      {!reduce && (
        <motion.div
          className="absolute left-1/2 top-[40%] h-[7.25rem] w-[7.25rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, color-mix(in oklab, var(--color-emerald-glow) 24%, transparent) 48deg, color-mix(in oklab, var(--color-gold) 18%, transparent) 72deg, transparent 120deg)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {!reduce &&
        [
          { size: '5.5rem', duration: 11, delay: 0 },
          { size: '7rem', duration: 16, delay: 2.4 },
        ].map((orbit, index) => (
          <motion.div
            key={orbit.size}
            className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2"
            style={{ width: orbit.size, height: orbit.size }}
            animate={{ rotate: 360 }}
            transition={{ duration: orbit.duration, repeat: Infinity, ease: 'linear', delay: orbit.delay }}
          >
            <span
              className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gold shadow-[0_0_12px_rgba(255,176,0,0.55)]"
              style={{ opacity: index === 0 ? 1 : 0.55 }}
            />
          </motion.div>
        ))}

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 240 200" fill="none">
        <defs>
          <linearGradient id={trailId} x1="28" y1="148" x2="212" y2="148" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--color-emerald-glow)" stopOpacity="0" />
            <stop offset="0.35" stopColor="var(--color-emerald-glow)" stopOpacity="0.45" />
            <stop offset="0.65" stopColor="var(--color-gold)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--color-gold)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d="M 28 148 C 72 118, 168 118, 212 148"
          stroke="currentColor"
          className="text-bone/10"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="5 9"
        />

        {!reduce && (
          <motion.path
            d="M 28 148 C 72 118, 168 118, 212 148"
            stroke={`url(#${trailId})`}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="10 18"
            animate={{ strokeDashoffset: [0, -56] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
          />
        )}

        <motion.circle
          cx="212"
          cy="148"
          r="4"
          className="fill-gold/80"
          animate={reduce ? undefined : { opacity: [0.35, 1, 0.35], scale: [0.9, 1.15, 0.9] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>

      <div className="absolute left-1/2 top-[38%] z-10 flex -translate-x-1/2 -translate-y-1/2 items-center">
        {DIGITS.map((digit, index) => (
          <motion.span
            key={`${digit}-${index}`}
            className="relative px-[0.08rem] bg-gradient-to-b from-bone via-bone to-bone-dim bg-clip-text text-[3.35rem] font-extrabold leading-none tracking-[-0.05em] text-transparent sm:text-[3.85rem]"
            initial={{ opacity: 0, y: reduce ? 0 : 14 }}
            animate={{
              opacity: 1,
              y: reduce ? 0 : [0, index === 1 ? -4 : -2.5, 0],
            }}
            transition={
              reduce
                ? { duration: dur.md, ease: ease.luxe, delay: 0.18 + index * 0.08 }
                : {
                    opacity: { duration: dur.md, ease: ease.luxe, delay: 0.18 + index * 0.08 },
                    y: {
                      duration: 3.4 + index * 0.35,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: 0.55 + index * 0.12,
                    },
                  }
            }
          >
            {index === 1 ? (
              <>
                <motion.span
                  className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-gold/55 to-transparent"
                  animate={reduce ? undefined : { opacity: [0.25, 0.85, 0.25], scaleX: [0.7, 1, 0.7] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                />
                {digit}
              </>
            ) : (
              digit
            )}
          </motion.span>
        ))}
      </div>

      <motion.div
        className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-pill border border-bone/12 bg-ink/50 px-3.5 py-1.5 backdrop-blur-sm"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur.md, ease: ease.luxe, delay: 0.42 }}
      >
        <span className="text-[10px] font-semibold text-emerald-glow">مسیر نامعتبر</span>
        <span className="flex gap-0.5">
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
              className="h-1 w-1 rounded-full bg-gold"
              animate={reduce ? undefined : { opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: dot * 0.18, ease: 'easeInOut' }}
            />
          ))}
        </span>
      </motion.div>
    </motion.div>
  );
}
