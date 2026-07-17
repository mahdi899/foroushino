import { motion } from 'framer-motion'
import { Sparkles, Target } from 'lucide-react'
import { cn } from '@/lib/cn'

interface GoalTargetIconProps {
  complete?: boolean
  className?: string
}

const hitCycle = {
  duration: 2.1,
  repeat: Infinity,
  ease: 'easeOut' as const,
}

export function GoalTargetIcon({ complete = false, className }: GoalTargetIconProps) {
  if (complete) {
    return (
      <span
        className={cn(
          'icon-3d icon-3d-success relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-[15px]',
          className,
        )}
      >
        <motion.div
          animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles size={22} strokeWidth={2.25} className="text-white" />
        </motion.div>
      </span>
    )
  }

  return (
    <span
      className={cn(
        'icon-3d icon-3d-primary relative flex h-12 w-12 items-center justify-center overflow-visible rounded-[15px]',
        className,
      )}
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-[3px] rounded-full border border-white/45"
        animate={{ scale: [1.65, 1], opacity: [0.55, 0] }}
        transition={{ ...hitCycle, delay: 0 }}
      />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-[3px] rounded-full border border-white/35"
        animate={{ scale: [1.65, 1], opacity: [0.45, 0] }}
        transition={{ ...hitCycle, delay: 0.55 }}
      />

      <motion.span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]"
        animate={{
          x: ['10px', '0px', '0px'],
          y: ['-10px', '0px', '0px'],
          opacity: [0, 1, 0],
          scale: [0.4, 1.15, 0.2],
        }}
        transition={{
          duration: hitCycle.duration,
          repeat: Infinity,
          ease: ['easeIn', 'easeOut', 'easeIn'],
          times: [0, 0.68, 1],
        }}
      />

      <motion.span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90"
        animate={{
          x: ['-9px', '0px', '0px'],
          y: ['8px', '0px', '0px'],
          opacity: [0, 1, 0],
          scale: [0.35, 1, 0.15],
        }}
        transition={{
          duration: hitCycle.duration,
          repeat: Infinity,
          ease: ['easeIn', 'easeOut', 'easeIn'],
          times: [0.08, 0.72, 1],
        }}
      />

      <motion.div
        className="relative z-[1]"
        animate={{ scale: [1, 1, 1.14, 1] }}
        transition={{
          duration: hitCycle.duration,
          repeat: Infinity,
          ease: 'easeOut',
          times: [0, 0.65, 0.78, 1],
        }}
      >
        <motion.div
          animate={{ rotate: [0, 0, -6, 4, 0] }}
          transition={{
            duration: hitCycle.duration,
            repeat: Infinity,
            ease: 'easeOut',
            times: [0, 0.65, 0.75, 0.88, 1],
          }}
        >
          <Target size={22} strokeWidth={2.25} className="text-white" />
        </motion.div>
      </motion.div>
    </span>
  )
}
