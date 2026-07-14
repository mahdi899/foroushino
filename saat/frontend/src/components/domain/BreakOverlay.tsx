import { useId } from 'react'
import { motion } from 'framer-motion'
import { Coffee } from 'lucide-react'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

const pourLoop = { duration: 2.8, repeat: Infinity, ease: 'easeInOut' as const }

function CoffeePourAnimation() {
  const clipId = useId().replace(/:/g, '')

  return (
    <div className="relative mx-auto h-[168px] w-[168px]" aria-hidden>
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[120px] w-[120px] -translate-x-1/2 -translate-y-[42%] rounded-full bg-amber-500/25 blur-2xl"
        animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.45, 0.75, 0.45] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute left-1/2 top-0 z-[2] h-[58px] w-[50px] -translate-x-1/2"
        animate={{ rotate: [-10, -18, -10], y: [0, 1, 0] }}
        transition={pourLoop}
      >
        <svg viewBox="0 0 50 58" className="h-full w-full drop-shadow-[0_8px_12px_rgba(92,51,23,0.35)]">
          <defs>
            <linearGradient id={`pot-${clipId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C49A6C" />
              <stop offset="55%" stopColor="#8B5E3C" />
              <stop offset="100%" stopColor="#5C3D2E" />
            </linearGradient>
          </defs>
          <path
            d="M10 18 L38 14 L36 34 L12 38 Z"
            fill={`url(#pot-${clipId})`}
            stroke="#4A2F1F"
            strokeWidth="1.2"
          />
          <path d="M38 20 Q50 22 48 30 Q46 38 36 35" fill="none" stroke="#4A2F1F" strokeWidth="2.2" />
          <ellipse cx="24" cy="15" rx="15" ry="4.5" fill="#3D2818" opacity="0.85" />
          <motion.ellipse
            cx="24"
            cy="16"
            rx="11"
            ry="3"
            fill="#2A1810"
            animate={{ opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>

        <motion.div
          className="absolute left-1/2 top-[36px] w-[6px] -translate-x-1/2 overflow-hidden rounded-full"
          animate={{ height: [0, 34, 34, 0], opacity: [0, 1, 1, 0] }}
          transition={{ ...pourLoop, times: [0, 0.32, 0.72, 1] }}
        >
          <div className="h-full w-full bg-gradient-to-b from-[#3D2314] via-[#6F4E37] to-[#8B6345]" />
          <motion.span
            className="absolute inset-x-0 top-0 h-1 bg-amber-200/40"
            animate={{ y: [0, 30] }}
            transition={{ ...pourLoop, times: [0, 0.72, 1], repeat: Infinity }}
          />
        </motion.div>
      </motion.div>

      <svg viewBox="0 0 168 168" className="absolute inset-0 h-full w-full">
        <ellipse cx="84" cy="138" rx="46" ry="8" fill="#000" opacity="0.08" />
        <ellipse cx="84" cy="134" rx="40" ry="6" fill="#E8DDD0" stroke="#C9B8A4" strokeWidth="1.5" />
        <path
          d="M44 112 L44 96 Q44 82 84 82 Q124 82 124 96 L124 112 Q124 128 84 128 Q44 128 44 112 Z"
          fill="#FAF6F1"
          stroke="#D4C4B0"
          strokeWidth="2"
        />
        <path d="M124 100 L140 96 L140 108 L124 110 Z" fill="#FAF6F1" stroke="#D4C4B0" strokeWidth="1.5" />
        <clipPath id={clipId}>
          <path d="M48 112 L48 98 Q48 86 84 86 Q120 86 120 98 L120 112 Q120 124 84 124 Q48 124 48 112 Z" />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          <motion.rect
            x="46"
            width="76"
            fill="#5C3D2E"
            animate={{ y: [124, 94, 94], height: [0, 30, 30] }}
            transition={{ ...pourLoop, times: [0, 0.58, 1] }}
          />
          <motion.ellipse
            cx="84"
            rx="34"
            ry="5.5"
            fill="#8B6345"
            animate={{ cy: [124, 96, 96], opacity: [0, 1, 1] }}
            transition={{ ...pourLoop, times: [0, 0.58, 1] }}
          />
          {[0, 1, 2].map((i) => (
            <motion.ellipse
              key={i}
              cx="84"
              rx="8"
              ry="2"
              fill="none"
              stroke="#A67C52"
              strokeWidth="1"
              initial={{ cy: 100, opacity: 0 }}
              animate={{ cy: [100, 88], opacity: [0.6, 0], rx: [8, 22] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                delay: 1.2 + i * 0.35,
                ease: 'easeOut',
              }}
            />
          ))}
        </g>
      </svg>

      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white/70"
          style={{
            left: `calc(50% + ${(i - 1.5) * 12}px)`,
            width: 3 + (i % 2),
            height: 3 + (i % 2),
          }}
          initial={{ y: 72, opacity: 0, scale: 0.5 }}
          animate={{
            y: [72, 38, 28],
            opacity: [0, 0.85, 0],
            scale: [0.5, 1, 0.7],
            x: [(i - 1.5) * 2, (i - 1.5) * 8],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            delay: 1 + i * 0.22,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  )
}

export function BreakOverlay({ onResume }: { onResume: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32 }}
      className="absolute inset-0 z-20 flex items-center justify-center px-5 pb-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-background/10 backdrop-blur-[2px]" />

      <motion.div
        initial={{ y: 28, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 18, scale: 0.97, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        className={cn(
          'relative w-full max-w-[300px] overflow-hidden rounded-[28px] p-6 text-center',
          'border border-white/45 bg-white/18 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.28)]',
          'backdrop-blur-2xl backdrop-saturate-150',
          'dark:border-white/12 dark:bg-neutral-900/28',
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/20" />

        <CoffeePourAnimation />

        <div className="relative mt-1">
          <span className="mx-auto mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-300/35 bg-amber-400/15 px-3 py-1 text-[11px] font-bold text-amber-800 backdrop-blur-sm dark:text-amber-200">
            <Coffee size={13} strokeWidth={2.35} />
            در استراحت
          </span>
          <h2 className="text-[18px] font-extrabold text-neutral-900 drop-shadow-sm dark:text-white">
            وقت یک استراحت کوتاه
          </h2>
          <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-neutral-700/90 dark:text-neutral-200/85">
            صفحه پشت سر پرده مات است؛ وقتی آماده شدی برگرد به کار.
          </p>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            haptic('medium')
            onResume()
          }}
          className={cn(
            'relative mt-5 w-full overflow-hidden rounded-2xl py-3.5 text-[14px] font-bold text-white',
            'bg-gradient-to-l from-[#3390EC] to-[#5EB0FF]',
            'shadow-[0_10px_24px_-8px_rgba(51,144,236,0.55)]',
            'dark:from-[#8774E1] dark:to-[#A894EE]',
          )}
        >
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
          <span className="relative">برگشت به کار</span>
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
