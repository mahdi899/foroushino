import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface ChipProps {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  icon?: ReactNode
  className?: string
}

export function Chip({ children, active, onClick, icon, className }: ChipProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 h-9 text-[13px] font-bold border transition-colors',
        active
          ? 'bg-primary-600 text-white border-primary-600 shadow-[0_6px_16px_-8px_rgba(13,148,136,0.6)]'
          : 'bg-surface text-neutral-600 border-border',
        className,
      )}
    >
      {icon}
      {children}
    </motion.button>
  )
}
