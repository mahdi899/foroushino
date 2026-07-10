'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';
import { Compass, MapPin } from 'lucide-react';

const ORBIT_PATH = 'M 120 100 m -58 0 a 58 58 0 1 0 116 0 a 58 58 0 1 0 -116 0';
const SIGNAL_PATH = 'M 44 118 C 78 88, 162 88, 196 118';

/** Lost-route animation for the public 404 page. */
export function NotFoundAnimation() {
  const uid = useId().replace(/:/g, '');
  const beamId = `nf-beam-${uid}`;
  const glowId = `nf-glow-${uid}`;

  return (
    <div className="relative mx-auto mb-1 h-56 w-full max-w-[19rem] sm:h-60" aria-hidden>
      <div className="pointer-events-none absolute inset-3 rounded-[1.75rem] bg-gradient-to-b from-emerald/[0.08] via-white/35 to-gold/[0.1] ring-1 ring-emerald/10" />
      <div className="pointer-events-none absolute inset-3 overflow-hidden rounded-[1.75rem]">
        <div className="absolute inset-0 scanlines opacity-[0.14]" />
        <motion.div
          className="absolute inset-x-8 top-1/2 h-px bg-gradient-to-r from-transparent via-gold/35 to-transparent"
          animate={{ opacity: [0.15, 0.65, 0.15] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {[0, 1, 2].map((ring) => (
        <motion.div
          key={ring}
          className="absolute left-1/2 top-[48%] h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald/10"
          initial={{ scale: 0.55, opacity: 0.45 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 3.4, repeat: Infinity, delay: ring * 0.8, ease: 'easeOut' }}
        />
      ))}

      <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 240 200" fill="none">
        <defs>
          <linearGradient id={beamId} x1="44" y1="118" x2="196" y2="118" gradientUnits="userSpaceOnUse">
            <stop stopColor="#003b40" stopOpacity="0" />
            <stop offset="0.35" stopColor="#008c96" stopOpacity="0.35" />
            <stop offset="0.5" stopColor="#25a0a6" stopOpacity="1" />
            <stop offset="0.65" stopColor="#ffb000" stopOpacity="0.55" />
            <stop offset="1" stopColor="#003b40" stopOpacity="0" />
          </linearGradient>
          <radialGradient
            id={glowId}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(120 98) rotate(90) scale(42 28)"
          >
            <stop stopColor="#25a0a6" stopOpacity="0.28" />
            <stop offset="1" stopColor="#25a0a6" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="120" cy="98" rx="44" ry="24" fill={`url(#${glowId})`} />

        <path
          d={ORBIT_PATH}
          stroke="currentColor"
          className="text-emerald/12"
          strokeWidth="2"
          strokeDasharray="5 9"
        />
        <motion.path
          d={ORBIT_PATH}
          stroke={`url(#${beamId})`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="8 16"
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '120px 100px' }}
        />

        <path
          d={SIGNAL_PATH}
          stroke="currentColor"
          className="text-emerald/10"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <motion.path
          d={SIGNAL_PATH}
          stroke={`url(#${beamId})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="6 14"
          animate={{ strokeDashoffset: [0, -40] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
        />
      </svg>

      <motion.div
        className="absolute left-3 top-[36%] -translate-y-1/2"
        animate={{ y: [0, -6, 0], rotate: [-8, 8, -8] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="relative">
          <div className="absolute -inset-1 rounded-[1.1rem] bg-emerald/10 blur-md" />
          <div className="relative grid h-[3.5rem] w-[3.5rem] place-items-center rounded-[1.1rem] border border-white/75 bg-white/95 shadow-[0_10px_30px_rgba(0,59,64,0.14)] backdrop-blur-sm">
            <Compass className="h-6 w-6 text-emerald" strokeWidth={1.6} />
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute right-1 top-[32%] -translate-y-1/2"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      >
        <div className="relative">
          <div className="absolute -inset-2 rounded-[1.2rem] bg-gold/15 blur-lg" />
          <div className="relative grid h-[3.75rem] w-[3.75rem] place-items-center rounded-[1.1rem] border border-white/80 bg-white/95 shadow-[0_10px_30px_rgba(255,176,0,0.16)] backdrop-blur-sm">
            <MapPin className="h-6 w-6 text-gold" strokeWidth={1.6} />
            <motion.span
              className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gold shadow-[0_0_8px_rgba(255,176,0,0.85)]"
              animate={{ opacity: [0.45, 1, 0.45], scale: [1, 1.15, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute left-1/2 top-[44%] z-10 -translate-x-1/2 -translate-y-1/2"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="relative px-1">
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-2xl bg-emerald/20 blur-xl"
            animate={{ opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <p className="relative bg-gradient-to-b from-bone via-bone to-bone-dim bg-clip-text text-[3.35rem] font-extrabold leading-none tracking-[-0.04em] text-transparent sm:text-[3.75rem]">
            ۴۰۴
          </p>
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-pill border border-white/70 bg-white/90 px-3.5 py-1.5 shadow-soft backdrop-blur-sm"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="text-[10px] font-semibold text-emerald-deep">مسیر نامعتبر</span>
        <span className="flex gap-0.5">
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
              className="h-1 w-1 rounded-full bg-gold"
              animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: dot * 0.18, ease: 'easeInOut' }}
            />
          ))}
        </span>
      </motion.div>
    </div>
  );
}
