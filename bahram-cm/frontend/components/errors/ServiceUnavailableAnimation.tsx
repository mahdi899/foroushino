'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';
import { Monitor } from 'lucide-react';
import { BrandMark } from '@/components/layout/Header';
import { siteConfig } from '@/config/site';

const CONNECTION_PATH = 'M 54 92 C 88 62, 152 62, 186 92';

/** Reconnecting signal animation for outage / error states. */
export function ServiceUnavailableAnimation() {
  const uid = useId().replace(/:/g, '');
  const beamId = `beam-${uid}`;
  const glowId = `glow-${uid}`;

  return (
    <div className="relative mx-auto mb-2 h-60 w-full max-w-[18rem]" aria-hidden>
      <div className="pointer-events-none absolute inset-3 rounded-[1.75rem] bg-gradient-to-b from-primary/[0.07] via-white/40 to-accent/[0.08] ring-1 ring-primary/10" />
      <div className="pointer-events-none absolute inset-3 overflow-hidden rounded-[1.75rem]">
        <div className="absolute inset-0 scanlines opacity-[0.18]" />
        <motion.div
          className="absolute inset-x-6 top-1/2 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
          animate={{ opacity: [0.2, 0.7, 0.2] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {[0, 1, 2, 3].map((ring) => (
        <motion.div
          key={ring}
          className="absolute left-1/2 top-[46%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10"
          initial={{ scale: 0.5, opacity: 0.5 }}
          animate={{ scale: 1.45, opacity: 0 }}
          transition={{ duration: 3.2, repeat: Infinity, delay: ring * 0.75, ease: 'easeOut' }}
        />
      ))}

      <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 240 200" fill="none">
        <defs>
          <linearGradient id={beamId} x1="54" y1="92" x2="186" y2="92" gradientUnits="userSpaceOnUse">
            <stop stopColor="#064c45" stopOpacity="0" />
            <stop offset="0.35" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="0.5" stopColor="#34d399" stopOpacity="1" />
            <stop offset="0.65" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="1" stopColor="#064c45" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={glowId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(120 92) rotate(90) scale(28 48)">
            <stop stopColor="#34d399" stopOpacity="0.35" />
            <stop offset="1" stopColor="#34d399" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="120" cy="92" rx="34" ry="18" fill={`url(#${glowId})`} />

        <path d={CONNECTION_PATH} stroke="currentColor" className="text-primary/10" strokeWidth="4" strokeLinecap="round" />
        <motion.path
          d={CONNECTION_PATH}
          stroke={`url(#${beamId})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="6 14"
          animate={{ strokeDashoffset: [0, -40] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
        />

        <motion.path
          d={CONNECTION_PATH}
          stroke={`url(#${beamId})`}
          strokeWidth="4"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="0.1 1"
          animate={{ strokeDashoffset: [0, -1] }}
          transition={{ duration: 2.1, repeat: Infinity, ease: 'linear' }}
        />
        <motion.path
          d={CONNECTION_PATH}
          stroke={`url(#${beamId})`}
          strokeWidth="2"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="0.04 1"
          animate={{ strokeDashoffset: [0.35, -0.65] }}
          transition={{ duration: 2.1, repeat: Infinity, ease: 'linear', delay: 1.05 }}
        />
      </svg>

      <motion.div
        className="absolute left-2 top-[38%] -translate-y-1/2"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="relative">
          <div className="absolute -inset-1 rounded-[1.1rem] bg-primary/10 blur-md" />
          <div className="relative grid h-[3.75rem] w-[3.75rem] place-items-center rounded-[1.1rem] border border-white/80 bg-white/95 shadow-[0_10px_30px_rgba(6,76,69,0.12)] backdrop-blur-sm">
            <Monitor className="h-7 w-7 text-primary" strokeWidth={1.6} />
            <span className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute right-0 top-[34%] -translate-y-1/2"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <div className="relative flex flex-col items-center gap-1.5">
          <div className="relative">
            <div className="absolute -inset-2 rounded-[1.25rem] bg-accent/20 blur-lg" />
            <div className="relative overflow-hidden rounded-[1.1rem] ring-2 ring-white/80">
              <BrandMark className="h-[4.25rem] w-[4.25rem] rounded-[1.1rem] shadow-[0_12px_32px_rgba(6,76,69,0.22)]" />
              <motion.div
                className="pointer-events-none absolute inset-x-0 z-20 h-[2px] bg-white/90 shadow-[0_0_14px_rgba(255,255,255,0.95)]"
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <motion.span
              className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent shadow-[0_0_10px_rgba(52,211,153,0.85)]"
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <span className="text-[11px] font-extrabold tracking-wide text-primary-dark">
            {siteConfig.brand.shortFa}
          </span>
        </div>
      </motion.div>

      <motion.div
        className="absolute left-1/2 top-[46%] z-10 -translate-x-1/2 -translate-y-1/2"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="relative">
          <motion.span
            className="block h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_12px_rgba(52,211,153,0.9)]"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/25"
            animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-pill border border-white/70 bg-white/90 px-3.5 py-1.5 shadow-soft backdrop-blur-sm"
        animate={{ opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="text-[10px] font-semibold text-primary">در حال اتصال مجدد</span>
        <span className="flex gap-0.5">
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
              className="h-1 w-1 rounded-full bg-accent"
              animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: dot * 0.18, ease: 'easeInOut' }}
            />
          ))}
        </span>
      </motion.div>
    </div>
  );
}
