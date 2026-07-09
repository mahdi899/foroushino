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
      whileTap={{ scale: 0.9 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 16, stiffness: 340 }}
      onClick={onClick}
      aria-label={label}
      className={cn(
        'glass-fab absolute bottom-[96px] left-5 z-30 flex h-14 w-14 items-center justify-center rounded-full',
        'text-[#3390EC] dark:text-[#8774E1]',
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-[#3390EC]/20 to-[#8774E1]/15 dark:from-[#8774E1]/25 dark:to-[#3390EC]/10" />
      <span className="relative">{icon ?? <Plus size={26} strokeWidth={2.5} />}</span>
    </motion.button>
  )
}
