import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface FabProps {
  onClick?: () => void
  icon?: ReactNode
  className?: string
  label?: string
}

export function Fab({ onClick, icon, className, label }: FabProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 18, stiffness: 300 }}
      onClick={onClick}
      aria-label={label}
      className={cn(
        'absolute bottom-[96px] left-5 z-30 flex h-14 w-14 items-center justify-center rounded-2xl',
        'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-float',
        className,
      )}
    >
      {icon ?? <Plus size={26} strokeWidth={2.5} />}
    </motion.button>
  )
}
