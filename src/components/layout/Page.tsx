import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface PageProps {
  children: ReactNode
  className?: string
  withNav?: boolean
}

export function Page({ children, className, withNav = true }: PageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={cn('min-h-full', withNav && 'pb-[96px]', className)}
    >
      {children}
    </motion.div>
  )
}
