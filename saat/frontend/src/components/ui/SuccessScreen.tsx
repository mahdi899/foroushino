import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Check, type LucideIcon } from 'lucide-react'
import { Button } from './Button'

interface SuccessScreenProps {
  title: string
  description?: string
  icon?: LucideIcon
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary?: () => void
  children?: ReactNode
}

export function SuccessScreen({
  title,
  description,
  icon: Icon = Check,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  children,
}: SuccessScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-surface/95 glass px-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 220 }}
        className="flex h-24 w-24 items-center justify-center rounded-full bg-success-500 text-white shadow-float"
      >
        <Icon size={44} strokeWidth={3} />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-5 text-xl font-black text-neutral-900"
      >
        {title}
      </motion.h2>
      {description && (
        <p className="mt-1.5 max-w-[270px] text-center text-[13px] font-bold leading-6 text-neutral-500">
          {description}
        </p>
      )}

      {children && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 w-full"
        >
          {children}
        </motion.div>
      )}

      <div className="mt-6 w-full space-y-2.5">
        <Button full size="lg" onClick={onPrimary}>
          {primaryLabel}
        </Button>
        {secondaryLabel && onSecondary && (
          <button onClick={onSecondary} className="flex w-full items-center justify-center text-sm font-bold text-neutral-400">
            {secondaryLabel}
          </button>
        )}
      </div>
    </motion.div>
  )
}
